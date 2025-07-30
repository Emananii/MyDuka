from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, User, Store, InvitationToken
from datetime import datetime, timedelta
import secrets
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy import func
from http import HTTPStatus
from app.routes.auth_routes import role_required, EMAIL_REGEX
from app.services.user_services import can_deactivate_user, can_delete_user

# Email Service
class EmailService:
    @staticmethod
    def send_invitation_email(email, token, inviter_name, role='admin'):
        """Send invitation email with registration link"""
        try:
            smtp_server = os.getenv('SMTP_HOST', 'smtp.gmail.com')
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            smtp_user = os.getenv('SMTP_USER')
            smtp_password = os.getenv('SMTP_PASSWORD')
            from_email = os.getenv('FROM_EMAIL', smtp_user)
            
            if not all([smtp_user, smtp_password]):
                raise ValueError("Email configuration missing")
            
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
            invitation_link = f"{frontend_url}/register?token={token}"
            
            subject = f"Admin Account Invitation - {role.title()} Role"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">You've been invited!</h2>
                    <p>Hello,</p>
                    <p><strong>{inviter_name}</strong> has invited you to join as a <strong>{role.title()}</strong>.</p>
                    <p>Click the button below to complete your registration:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invitation_link}" 
                           style="background-color: #007bff; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-weight: bold;">
                            Complete Registration
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <strong>⚠️ Important:</strong> This invitation expires in 24 hours.
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; font-size: 12px; background-color: #f1f3f4; padding: 10px; border-radius: 3px;">
                        {invitation_link}
                    </p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">
                        If you didn't expect this invitation, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_email
            msg['To'] = email
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            return True, "Email sent successfully"
            
        except Exception as e:
            current_app.logger.error(f"Email sending failed: {str(e)}")
            return False, f"Failed to send email: {str(e)}"

# Invitation Routes
invitations_bp = Blueprint("invitations", __name__, url_prefix="/api/invitations")

@invitations_bp.route("/send", methods=["POST"])
@jwt_required()
@role_required("merchant")
def send_invitation():
    """Send admin invitation email"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN
    
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    role = data.get("role", "admin")
    store_id = data.get("store_id")
    
    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"error": "Valid email is required"}), HTTPStatus.BAD_REQUEST
    
    if role not in ["admin"]:
        return jsonify({"error": "Invalid role. Only 'admin' invitations are allowed"}), HTTPStatus.BAD_REQUEST
    
    existing_user = User.query.filter(func.lower(User.email) == email).first()
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), HTTPStatus.CONFLICT
    
    existing_invitation = InvitationToken.query.filter(
        func.lower(InvitationToken.email) == email,
        InvitationToken.used == False,
        InvitationToken.expires_at > datetime.utcnow()
    ).first()
    
    if existing_invitation:
        return jsonify({
            "error": "An active invitation already exists for this email",
            "expires_at": existing_invitation.expires_at.isoformat()
        }), HTTPStatus.CONFLICT
    
    if store_id:
        store = Store.query.get(store_id)
        if not store:
            return jsonify({"error": "Invalid store ID"}), HTTPStatus.BAD_REQUEST
        if current_user.store_id and store_id != current_user.store_id:
            return jsonify({"error": "You can only create admins for your assigned store"}), HTTPStatus.FORBIDDEN
    
    try:
        invitation = InvitationToken(
            email=email,
            invited_by=current_user_id,
            role=role,
            store_id=store_id
        )
        
        db.session.add(invitation)
        db.session.commit()
        
        success, message = EmailService.send_invitation_email(
            email=email,
            token=invitation.token,
            inviter_name=current_user.name,
            role=role
        )
        
        if not success:
            db.session.delete(invitation)
            db.session.commit()
            return jsonify({"error": message}), HTTPStatus.INTERNAL_SERVER_ERROR
        
        return jsonify({
            "message": "Invitation sent successfully",
            "invitation": {
                "email": invitation.email,
                "role": invitation.role,
                "expires_at": invitation.expires_at.isoformat()
            }
        }), HTTPStatus.CREATED
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to send invitation: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@invitations_bp.route("/validate/<token>", methods=["GET"])
def validate_invitation(token):
    """Validate invitation token"""
    invitation = InvitationToken.query.filter_by(token=token).first()
    
    if not invitation:
        return jsonify({"error": "Invalid invitation token"}), HTTPStatus.NOT_FOUND
    
    if not invitation.is_valid():
        return jsonify({
            "error": "Invitation has expired or been used",
            "expired": datetime.utcnow() >= invitation.expires_at,
            "used": invitation.used
        }), HTTPStatus.BAD_REQUEST
    
    return jsonify({
        "valid": True,
        "email": invitation.email,
        "role": invitation.role,
        "store_id": invitation.store_id,
        "inviter": invitation.inviter.name,
        "expires_at": invitation.expires_at.isoformat()
    }), HTTPStatus.OK

@invitations_bp.route("/register", methods=["POST"])
def register_with_invitation():
    """Complete registration using invitation token"""
    data = request.get_json()
    token = data.get("token")
    name = data.get("name", "").strip()
    password = data.get("password")
    confirm_password = data.get("confirm_password")
    
    if not all([token, name, password, confirm_password]):
        return jsonify({"error": "All fields are required"}), HTTPStatus.BAD_REQUEST
    
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), HTTPStatus.BAD_REQUEST
    
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), HTTPStatus.BAD_REQUEST
    
    invitation = InvitationToken.query.filter_by(token=token).first()
    
    if not invitation:
        return jsonify({"error": "Invalid invitation token"}), HTTPStatus.NOT_FOUND
    
    if not invitation.is_valid():
        return jsonify({"error": "Invitation has expired or been used"}), HTTPStatus.BAD_REQUEST
    
    existing_user = User.query.filter(func.lower(User.email) == invitation.email).first()
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), HTTPStatus.CONFLICT
    
    try:
        new_user = User(
            name=name,
            email=invitation.email,
            password=password,
            role=invitation.role,
            store_id=invitation.store_id,
            created_by=invitation.invited_by,
            is_active=True
        )
        
        db.session.add(new_user)
        invitation.used = True
        db.session.commit()
        
        return jsonify({
            "message": "Registration completed successfully",
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role,
                "store_id": new_user.store_id
            }
        }), HTTPStatus.CREATED
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Registration failed: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@invitations_bp.route("/pending", methods=["GET"])
@jwt_required()
@role_required("merchant")
def get_pending_invitations():
    """Get all pending invitations (merchant only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN
    
    invitations = InvitationToken.query.filter(
        InvitationToken.invited_by == current_user_id,
        InvitationToken.used == False,
        InvitationToken.expires_at > datetime.utcnow()
    ).order_by(InvitationToken.created_at.desc()).all()
    
    return jsonify({
        "invitations": [invitation.serialize() for invitation in invitations]
    }), HTTPStatus.OK

@invitations_bp.route("/cancel/<token>", methods=["DELETE"])
@jwt_required()
@role_required("merchant")
def cancel_invitation(token):
    """Cancel a pending invitation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN
    
    invitation = InvitationToken.query.filter_by(
        token=token,
        invited_by=current_user_id,
        used=False
    ).first()
    
    if not invitation:
        return jsonify({"error": "Invitation not found or already used"}), HTTPStatus.NOT_FOUND
    
    try:
        db.session.delete(invitation)
        db.session.commit()
        
        return jsonify({"message": "Invitation cancelled successfully"}), HTTPStatus.OK
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to cancel invitation: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# User Routes
users_api_bp = Blueprint("users_api", __name__, url_prefix="/api/users")

def serialize_user(user):
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "store_id": user.store_id,
        "created_by": user.created_by,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "is_deleted": user.is_deleted
    }

@users_api_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin")
def get_all_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    if current_user.role == "merchant":
        users = User.query.filter_by(is_deleted=False).all()
    elif current_user.role == "admin" and current_user.store_id:
        users = User.query.filter_by(store_id=current_user.store_id, is_deleted=False).all()
    else:
        return jsonify({"error": "Unauthorized to view all users"}), HTTPStatus.FORBIDDEN

    return jsonify([serialize_user(user) for user in users]), HTTPStatus.OK

@users_api_bp.route("/stores/<int:store_id>/users", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_users_by_store(store_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    if current_user.role == 'admin':
        if not current_user.store_id or current_user.store_id != store_id:
            return jsonify({"error": "Unauthorized to view users for this store."}), HTTPStatus.FORBIDDEN
    else:
        return jsonify({"error": "Unauthorized to access this endpoint."}), HTTPStatus.FORBIDDEN

    allowed_roles_for_admin_view = ['cashier', 'clerk']
    users_in_store = User.query.filter(
        User.store_id == store_id,
        User.role.in_(allowed_roles_for_admin_view),
        User.is_deleted == False
    ).all()

    return jsonify([serialize_user(user) for user in users_in_store]), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
@role_required("merchant", "admin")
def get_user_by_id(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    if current_user.role == "admin":
        if not current_user.store_id or user.store_id != current_user.store_id:
            return jsonify({"error": "Unauthorized to view this user"}), HTTPStatus.FORBIDDEN
    
    return jsonify(serialize_user(user)), HTTPStatus.OK

@users_api_bp.route("/create", methods=["POST"])
@jwt_required()
@role_required("merchant", "admin", "clerk")
def create_user():
    """
    Create a new user. Admins must be created via the invitation system.
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    requested_role = data.get("role")
    store_id = data.get("store_id")

    if not all([name, email, password, requested_role]):
        return jsonify({"error": "Missing name, email, password, or role"}), HTTPStatus.BAD_REQUEST

    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Invalid email format"}), HTTPStatus.BAD_REQUEST

    if User.query.filter(func.lower(User.email) == func.lower(email)).first():
        return jsonify({"error": "Email already exists"}), HTTPStatus.CONFLICT

    allowed_roles_to_create = {
        "merchant": ["cashier", "clerk"],
        "admin": ["cashier", "clerk"],
        "clerk": ["cashier"],
    }

    if requested_role not in allowed_roles_to_create.get(current_user.role, []):
        if requested_role == "admin":
            return jsonify({
                "error": "Admin users must be created via invitation system. Use /api/invitations/send endpoint."
            }), HTTPStatus.FORBIDDEN
        else:
            return jsonify({
                "error": f"Your role ({current_user.role}) is not allowed to create '{requested_role}' users"
            }), HTTPStatus.FORBIDDEN

    if current_user.role in ["admin", "clerk"]:
        if not current_user.store_id:
            return jsonify({"error": f"Your account is not assigned to a store. Cannot create users."}), HTTPStatus.FORBIDDEN
        if store_id and store_id != current_user.store_id:
            return jsonify({"error": f"{current_user.role.capitalize()} can only create users for their assigned store."}), HTTPStatus.FORBIDDEN
        store_id = current_user.store_id
    else:
        if store_id:
            store = Store.query.get(store_id)
            if not store:
                return jsonify({"error": "Invalid store ID"}), HTTPStatus.BAD_REQUEST
            if current_user.store_id and store_id != current_user.store_id:
                return jsonify({"error": "You can only create users for your assigned store"}), HTTPStatus.FORBIDDEN

    new_user = User(
        name=name,
        email=email,
        password=password,
        role=requested_role,
        created_by=current_user_id,
        store_id=store_id
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{requested_role.capitalize()} user created successfully",
        "user": serialize_user(new_user)
    }), HTTPStatus.CREATED

@users_api_bp.route("/<int:user_id>", methods=["PUT", "PATCH"])
@jwt_required()
@role_required("merchant", "admin")
def update_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    user_to_update = User.query.get(user_id)
    if not user_to_update:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    if user_id == current_user_id:
        return jsonify({"error": "You cannot modify your own account via this endpoint."}), HTTPStatus.FORBIDDEN

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), HTTPStatus.BAD_REQUEST

    can_update = False
    if current_user.role == "merchant":
        if user_to_update.role != "merchant":
            can_update = True
    elif current_user.role == "admin":
        if user_to_update.role in ["cashier", "clerk"]:
            if current_user.store_id and user_to_update.store_id == current_user.store_id:
                can_update = True

    if not can_update:
        return jsonify({"error": "Unauthorized to update this user."}), HTTPStatus.FORBIDDEN

    if 'name' in data:
        user_to_update.name = data['name']
    if 'email' in data:
        new_email = data['email']
        if not EMAIL_REGEX.match(new_email):
            return jsonify({"error": "Invalid email format"}), HTTPStatus.BAD_REQUEST
        existing_user = User.query.filter(func.lower(User.email) == func.lower(new_email), User.id != user_id).first()
        if existing_user:
            return jsonify({"error": "Email already in use"}), HTTPStatus.CONFLICT
        user_to_update.email = new_email
    if 'role' in data:
        new_role = data['role']
        assignable_roles = {
            "merchant": ["admin", "cashier", "clerk"],
            "admin": ["cashier", "clerk"]
        }
        if new_role not in assignable_roles.get(current_user.role, []):
            return jsonify({"error": f"Unauthorized to assign role '{new_role}'"}), HTTPStatus.FORBIDDEN
        user_to_update.role = new_role

    if 'store_id' in data:
        new_store_id = data['store_id']
        if current_user.role == "merchant":
            if new_store_id is not None and Store.query.get(new_store_id) is None:
                return jsonify({"error": "Store not found"}), HTTPStatus.BAD_REQUEST
            user_to_update.store_id = new_store_id
        elif current_user.role == "admin":
            if new_store_id is not None:
                if not current_user.store_id or new_store_id != current_user.store_id:
                    return jsonify({"error": "Admin can only assign users to their own store."}), HTTPStatus.FORBIDDEN
                if Store.query.get(new_store_id) is None:
                    return jsonify({"error": "Store not found"}), HTTPStatus.BAD_REQUEST
                user_to_update.store_id = new_store_id
            else:
                return jsonify({"error": "Admin cannot unassign users from a store."}), HTTPStatus.FORBIDDEN

    if 'is_active' in data:
        if user_to_update.id == current_user_id:
            return jsonify({"error": "You cannot change your own active status."}), HTTPStatus.FORBIDDEN
        user_to_update.is_active = data['is_active']

    db.session.commit()
    return jsonify({
        "message": "User updated successfully",
        "user": serialize_user(user_to_update)
    }), HTTPStatus.OK

@users_api_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    store = Store.query.get(user.store_id) if user.store_id else None
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'store_id': user.store_id,
        'store_name': store.name if store else None
    }), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
@role_required("merchant", "admin")
def deactivate_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    is_authorized, message = can_deactivate_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.id == current_user_id:
        return jsonify({"error": "You cannot deactivate your own account."}), HTTPStatus.FORBIDDEN

    if not target_user.is_active:
        return jsonify({"error": "User already deactivated"}), HTTPStatus.CONFLICT

    target_user.is_active = False
    db.session.commit()

    return jsonify({
        "message": "User deactivated successfully",
        "user": serialize_user(target_user)
    }), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>/reactivate", methods=["POST"])
@jwt_required()
@role_required("merchant", "admin")
def reactivate_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user or not current_user.is_active:
        return jsonify({"error": "Invalid or inactive user"}), HTTPStatus.FORBIDDEN

    target_user = User.query.get_or_404(user_id)
    is_authorized, message = can_deactivate_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.is_active:
        return jsonify({"error": "User already active"}), HTTPStatus.CONFLICT

    target_user.is_active = True
    db.session.commit()

    return jsonify({
        "message": "User reactivated",
        "user": serialize_user(target_user)
    }), HTTPStatus.OK

@users_api_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("merchant", "admin")
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    is_authorized, message = can_delete_user(current_user, target_user)
    if not is_authorized:
        return jsonify({"error": message}), HTTPStatus.FORBIDDEN

    if target_user.id == current_user_id:
        return jsonify({"error": "You cannot delete your own account."}), HTTPStatus.FORBIDDEN

    if target_user.is_deleted:
        return jsonify({"error": "User already deleted"}), HTTPStatus.CONFLICT

    target_user.is_deleted = True
    target_user.email = f"{target_user.email}_deleted_{target_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    db.session.commit()

    return jsonify({"message": "User marked as deleted successfully"}), HTTPStatus.OK