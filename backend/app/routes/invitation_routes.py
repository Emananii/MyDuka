# app/routes/invitation_routes.py  
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
# Remove flask_cors import since global CORS handles it
from app.models import User, Store, InvitationToken, db
from app.services.email_service import EmailService
from app.routes.auth_routes import role_required, EMAIL_REGEX
from sqlalchemy import func
from http import HTTPStatus
from datetime import datetime

invitations_bp = Blueprint("invitations", __name__)

# Remove the after_request function - global CORS handles this

@invitations_bp.route("/send", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)  # Make JWT optional for OPTIONS requests
def send_invitation():
    """Send admin invitation email"""
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    
    # Now require JWT for actual POST request
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
    
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Check if user is merchant
    if not current_user or current_user.role != "merchant" or not current_user.is_active:
        return jsonify({"error": "Only active merchants can send invitations"}), HTTPStatus.FORBIDDEN
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), HTTPStatus.BAD_REQUEST
    
    email = data.get("email", "").lower().strip()
    role = data.get("role", "admin")
    store_id = data.get("store_id")
    
    # Validation
    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"error": "Valid email is required"}), HTTPStatus.BAD_REQUEST
    
    if role not in ["admin"]:  # Only allow admin invitations for now
        return jsonify({"error": "Invalid role. Only 'admin' invitations are allowed"}), HTTPStatus.BAD_REQUEST
    
    # Check if user already exists
    existing_user = User.query.filter(func.lower(User.email) == email).first()
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), HTTPStatus.CONFLICT
    
    # Check for existing active invitation
    existing_invitation = InvitationToken.query.filter(
        func.lower(InvitationToken.email) == email,
        InvitationToken.is_used == False,
        InvitationToken.is_deleted == False,
        InvitationToken.expires_at > datetime.utcnow()
    ).first()
    
    if existing_invitation:
        return jsonify({
            "error": "An active invitation already exists for this email",
            "expires_at": existing_invitation.expires_at.isoformat()
        }), HTTPStatus.CONFLICT
    
    # Validate store if provided
    store = None
    if store_id:
        store = Store.query.filter_by(id=store_id, is_deleted=False).first()
        if not store:
            return jsonify({"error": "Invalid store ID"}), HTTPStatus.BAD_REQUEST
        
        # Merchant can only create admins for their own store if they have one
        if current_user.store_id and store_id != current_user.store_id:
            return jsonify({"error": "You can only create admins for your assigned store"}), HTTPStatus.FORBIDDEN
    
    try:
        # Use the generate_token class method
        invitation = InvitationToken.generate_token(
            email=email,
            role=role,
            store_id=store_id,
            user_id=current_user_id
        )
        
        db.session.add(invitation)
        db.session.commit()
        
        # Send email - FIXED TO HANDLE TUPLE RETURN
        success, message = EmailService.send_invitation_email(
            email=email,
            token=invitation.token,
            inviter_name=current_user.name,
            role=role  # Pass role instead of store_name
        )
        
        if not success:
            # Rollback the invitation if email fails
            db.session.delete(invitation)
            db.session.commit()
            return jsonify({"error": f"Failed to send invitation email: {message}"}), HTTPStatus.INTERNAL_SERVER_ERROR
        
        return jsonify({
            "message": "Invitation sent successfully",
            "invitation": invitation.to_dict(),
            "email_status": message
        }), HTTPStatus.CREATED
        
    except Exception as e:
        db.session.rollback()
        print(f"Error sending invitation: {str(e)}")
        return jsonify({"error": f"Failed to send invitation: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@invitations_bp.route("/validate/<token>", methods=["GET", "OPTIONS"])
def validate_invitation(token):
    """Validate invitation token"""
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    
    invitation = InvitationToken.query.filter_by(token=token, is_deleted=False).first()
    
    if not invitation:
        return jsonify({"error": "Invalid invitation token"}), HTTPStatus.NOT_FOUND
    
    # Check if expired or used
    if invitation.expires_at < datetime.utcnow():
        return jsonify({"error": "Invitation has expired"}), HTTPStatus.BAD_REQUEST
    
    if invitation.is_used:
        return jsonify({"error": "Invitation has already been used"}), HTTPStatus.BAD_REQUEST
    
    # Get additional info
    store = Store.query.get(invitation.store_id) if invitation.store_id else None
    inviter = User.query.get(invitation.user_id)
    
    return jsonify({
        "valid": True,
        "invitation": {
            **invitation.to_dict(),
            "store_name": store.name if store else None,
            "inviter_name": inviter.name if inviter else None
        }
    }), HTTPStatus.OK

@invitations_bp.route("/register", methods=["POST", "OPTIONS"])
def register_with_invitation():
    """Complete registration using invitation token"""
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), HTTPStatus.BAD_REQUEST
    
    token = data.get("token")
    name = data.get("name", "").strip()
    password = data.get("password")
    confirm_password = data.get("confirm_password")
    
    # Validation
    if not all([token, name, password, confirm_password]):
        return jsonify({"error": "All fields are required"}), HTTPStatus.BAD_REQUEST
    
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), HTTPStatus.BAD_REQUEST
    
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), HTTPStatus.BAD_REQUEST
    
    # Find and validate invitation
    invitation = InvitationToken.query.filter_by(token=token, is_deleted=False).first()
    
    if not invitation:
        return jsonify({"error": "Invalid invitation token"}), HTTPStatus.NOT_FOUND
    
    if invitation.expires_at < datetime.utcnow():
        return jsonify({"error": "Invitation has expired"}), HTTPStatus.BAD_REQUEST
    
    if invitation.is_used:
        return jsonify({"error": "Invitation has already been used"}), HTTPStatus.BAD_REQUEST
    
    # Check if user already exists (double-check)
    existing_user = User.query.filter(func.lower(User.email) == invitation.email).first()
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), HTTPStatus.CONFLICT
    
    try:
        # Create new user
        new_user = User(
            name=name,
            email=invitation.email,
            role=invitation.role,
            store_id=invitation.store_id,
            created_by=invitation.user_id,
            is_active=True  # Auto-activate invited users
        )
        
        # Set password using the User model's method
        new_user.password = password
        
        db.session.add(new_user)
        
        # Mark invitation as used
        invitation.is_used = True
        
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
        print(f"Registration error: {str(e)}")
        return jsonify({"error": f"Registration failed: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@invitations_bp.route("/pending", methods=["GET", "OPTIONS"])
@jwt_required(optional=True)
def get_pending_invitations():
    """Get all pending invitations (merchant only)"""
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    
    # Require JWT for actual GET request
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
    
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != "merchant" or not current_user.is_active:
        return jsonify({"error": "Only active merchants can view invitations"}), HTTPStatus.FORBIDDEN
    
    # Get pending invitations sent by current user
    invitations = InvitationToken.query.filter(
        InvitationToken.user_id == current_user_id,
        InvitationToken.is_used == False,
        InvitationToken.is_deleted == False,
        InvitationToken.expires_at > datetime.utcnow()
    ).order_by(InvitationToken.created_at.desc()).all()
    
    # Include store names
    result = []
    for invitation in invitations:
        invitation_data = invitation.to_dict()
        if invitation.store_id:
            store = Store.query.get(invitation.store_id)
            invitation_data['store_name'] = store.name if store else None
        result.append(invitation_data)
    
    return jsonify({
        "invitations": result
    }), HTTPStatus.OK

@invitations_bp.route("/cancel/<token>", methods=["DELETE", "OPTIONS"])
@jwt_required(optional=True)
def cancel_invitation(token):
    """Cancel a pending invitation"""
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    
    # Require JWT for actual DELETE request
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
    
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != "merchant" or not current_user.is_active:
        return jsonify({"error": "Only active merchants can cancel invitations"}), HTTPStatus.FORBIDDEN
    
    invitation = InvitationToken.query.filter_by(
        token=token,
        user_id=current_user_id,
        is_used=False,
        is_deleted=False
    ).first()
    
    if not invitation:
        return jsonify({"error": "Invitation not found or already used"}), HTTPStatus.NOT_FOUND
    
    try:
        # Soft delete instead of hard delete
        invitation.is_deleted = True
        db.session.commit()
        
        return jsonify({"message": "Invitation cancelled successfully"}), HTTPStatus.OK
        
    except Exception as e:
        db.session.rollback()
        print(f"Error canceling invitation: {str(e)}")
        return jsonify({"error": f"Failed to cancel invitation: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# Test route for debugging
@invitations_bp.route("/test", methods=["GET", "POST", "OPTIONS"])
def test_route():
    """Test route to verify invitation blueprint is working"""
    return jsonify({
        "message": "Invitation blueprint is working!",
        "method": request.method,
        "timestamp": datetime.utcnow().isoformat()
    }), HTTPStatus.OK