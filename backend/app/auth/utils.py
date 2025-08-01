# app/auth/utils.py

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()

def hash_password(password):
    """Hashes a plain-text password using Argon2."""
    return ph.hash(password)

def verify_password(stored_hash, password):
    """
    Verifies a plain-text password against a stored Argon2 hash.
    Returns True if a match, False otherwise.
    """
    try:
        return ph.verify(stored_hash, password)
    except VerifyMismatchError:
        return False

def needs_rehash(stored_hash):
    """Checks if the stored password hash needs to be updated."""
    return ph.check_needs_rehash(stored_hash)