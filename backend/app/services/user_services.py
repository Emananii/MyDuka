from app.models import User, Store # Ensure Store is imported if used elsewhere in services

def can_create_user(current_user):
    return current_user.role.lower() in ["merchant", "admin", "clerk"] # Added clerk based on user_routes.py

def can_deactivate_user(current_user, target_user): # ⭐ MODIFIED: Accept target_user object directly ⭐
    if not current_user or not target_user:
        return False, "Invalid user or target user."

    # Prevent deactivating yourself
    if current_user.id == target_user.id:
        return False, "You cannot deactivate your own account."

    if not target_user.is_active:
        return False, "User is already inactive."

    # Admins and Merchants should only manage users within their own store,
    # unless the current_user is a merchant attempting to deactivate another merchant
    # (which current logic doesn't allow anyway).
    # This check needs to be careful: if current_user.store_id is None (e.g., a top-level merchant),
    # then this check might need to be adjusted based on your hierarchy rules.
    # Assuming merchant/admin can only manage within their assigned store for now.
    if current_user.store_id and target_user.store_id and \
       current_user.store_id != target_user.store_id:
        return False, "Unauthorized: Cannot manage users from other stores."


    current_role = current_user.role.lower()
    target_role = target_user.role.lower()

    # Merchants can deactivate Admins, Cashiers, Clerks, Users
    if current_role == "merchant" and target_role in ["admin", "cashier", "clerk", "user"]:
        return True, "Authorized"
    
    # Admins can deactivate Cashiers, Clerks, Users
    if current_role == "admin" and target_role in ["cashier", "clerk", "user"]:
        return True, "Authorized"

    return False, "Not permitted to deactivate this user role or due to store restrictions."

def can_delete_user(current_user, target_user): # ⭐ MODIFIED: Accept target_user object directly ⭐
    if not current_user or not target_user:
        return False, "Invalid user or target user."

    # Prevent deleting yourself
    if current_user.id == target_user.id:
        return False, "You cannot delete your own account."

    # Admins and Merchants should only manage users within their own store
    if current_user.store_id and target_user.store_id and \
       current_user.store_id != target_user.store_id:
        return False, "Unauthorized: Cannot manage users from other stores."

    current_role = current_user.role.lower()
    target_role = target_user.role.lower()

    # Merchants can delete Admins, Cashiers, Clerks, Users
    if current_role == 'merchant' and target_role in ['admin', 'cashier', 'clerk', 'user']:
        return True, "Authorized"

    # Admins can delete Clerks, Cashiers, Users
    if current_role == 'admin' and target_role in ['clerk', 'cashier', 'user']:
        return True, "Authorized"

    return False, "Not permitted to delete this user role or due to store restrictions."