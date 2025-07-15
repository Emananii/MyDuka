from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()

def hash_password(password):
    return ph.hash(password)

def verify_password(stored_hash, password):
    try:
        return ph.verify(stored_hash, password)
    except VerifyMismatchError:
        return False

def needs_rehash(stored_hash):
    return ph.check_needs_rehash(stored_hash)
