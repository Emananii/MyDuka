from app.models import User, Store # Ensure Store is imported if used elsewhere in services

def can_create_user(current_user):
    # ⭐ FIX: Removed 'user' role from allowed creation roles ⭐
    return current_user.role.lower() in ["merchant", "admin", "clerk"]

def can_deactivate_user(current_user, target_user):
    if not current_user or not target_user:
        return False, "Invalid user or target user."

    if current_user.id == target_user.id:
        return False, "You cannot deactivate your own account."

    if not target_user.is_active:
        return False, "User is already inactive."

    if current_user.store_id and target_user.store_id and \
       current_user.store_id != target_user.store_id:
        return False, "Unauthorized: Cannot manage users from other stores."

    current_role = current_user.role.lower()
    target_role = target_user.role.lower()

    # ⭐ FIX: Removed 'user' from allowed deactivation roles ⭐
    # Merchants can deactivate Admins, Cashiers, Clerks
    if current_role == "merchant" and target_role in ["admin", "cashier", "clerk"]:
        return True, "Authorized"
    
    # Admins can deactivate Cashiers, Clerks
    if current_role == "admin" and target_role in ["cashier", "clerk"]:
        return True, "Authorized"

    return False, "Not permitted to deactivate this user role or due to store restrictions."

def can_delete_user(current_user, target_user):
    if not current_user or not target_user:
        return False, "Invalid user or target user."
    
    if current_user.id == target_user.id:
        return False, "You cannot delete your own account."

    if current_user.store_id and target_user.store_id and \
       current_user.store_id != target_user.store_id:
        return False, "Unauthorized: Cannot manage users from other stores."

    current_role = current_user.role.lower()
    target_role = target_user.role.lower()

    # ⭐ FIX: Removed 'user' from allowed deletion roles ⭐
    # Merchants can delete Admins, Cashiers, Clerks
    if current_role == 'merchant' and target_role in ['admin', 'cashier', 'clerk']:
        return True, "Authorized"

    # Admins can delete Clerks, Cashiers
    if current_role == 'admin' and target_role in ['clerk', 'cashier']:
        return True, "Authorized"

    return False, "Not permitted to delete this user role or due to store restrictions."
