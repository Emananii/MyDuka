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

    current_role = current_user.role.lower()
    target_role = target_user.role.lower()

    # Merchants can deactivate Admins, Cashiers, Clerks regardless of store
    if current_role == "merchant":
        if target_role == "merchant":
            return False, "Merchants cannot deactivate other merchants."
        # A merchant can deactivate any non-merchant user (admin, cashier, clerk)
        if target_role in ["admin", "cashier", "clerk"]:
            return True, "Authorized"
        return False, "Merchants can only deactivate admin, cashier, or clerk roles."

    # Admins can deactivate Cashiers, Clerks ONLY within their store
    if current_role == "admin":
        # Ensure admin has a store_id and target user also has a store_id, and they match
        if not current_user.store_id or not target_user.store_id or \
           current_user.store_id != target_user.store_id:
            return False, "Unauthorized: Admins can only manage users within their assigned store."
        
        if target_role in ["cashier", "clerk"]:
            return True, "Authorized"
        return False, "Admins can only deactivate cashier or clerk roles."

    return False, "Not permitted to deactivate this user role or due to store restrictions."

def can_delete_user(current_user, target_user):
    if not current_user or not target_user:
        return False, "Invalid user or target user."
    
    if current_user.id == target_user.id:
        return False, "You cannot delete your own account."

    current_role = current_user.role.lower()
    target_role = target_user.role.lower()

    # Merchants can delete Admins, Cashiers, Clerks regardless of store
    if current_role == 'merchant':
        if target_role == "merchant":
            return False, "Merchants cannot delete other merchants."
        # A merchant can delete any non-merchant user (admin, cashier, clerk)
        if target_role in ["admin", "cashier", "clerk"]:
            return True, "Authorized"
        return False, "Merchants can only delete admin, cashier, or clerk roles."

    # Admins can delete Clerks, Cashiers ONLY within their store
    if current_role == 'admin':
        # Ensure admin has a store_id and target user also has a store_id, and they match
        if not current_user.store_id or not target_user.store_id or \
           current_user.store_id != target_user.store_id:
            return False, "Unauthorized: Admins can only manage users within their assigned store."

        if target_role in ['clerk', 'cashier']:
            return True, "Authorized"
        return False, "Admins can only delete cashier or clerk roles."

    return False, "Not permitted to delete this user role or due to store restrictions."