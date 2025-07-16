from app.models import User

def can_create_user(current_user):
    return current_user.role.lower() in ["merchant", "admin"]

def can_deactivate_user(current_user, target_user_id):
    target_user = User.query.get(target_user_id)
    if not target_user:
        return False, "User not found"
    
    if not target_user.is_active:
        return False, "User is already inactive"

    current_role = current_user.role.lower()
    target_role = target_user.role.lower()

    if current_role == "merchant" and target_role == "admin":
        return True, "Authorized"
    
    if current_role == "admin" and target_role in ["clerk", "cashier"]:
        return True, "Authorized"

    return False, "Not permitted to deactivate this role"
