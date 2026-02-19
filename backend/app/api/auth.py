"""
Authentication API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import (
    get_password_hash, verify_password, 
    create_access_token, get_current_active_user
)
from app.core.config import settings
from app.models.user import User, SubscriptionStatus
from app.models.organization import Organization
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.schemas.organization import OrganizationCreate, OrganizationResponse, OrganizationRegister
from app.utils.validators import validate_email, validate_password_strength
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    
    - Creates a new user account
    - Returns access token for immediate login
    """
    # Validate email
    if not validate_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password strength
    is_valid, error_msg = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if organization exists
    organization = db.query(Organization).filter(
        Organization.id == user_data.organization_id
    ).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    if not organization.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization is not active"
        )
    
    # Calculate trial end date
    trial_end_date = datetime.now(timezone.utc) + timedelta(days=organization.trial_period_days)
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        organization_id=user_data.organization_id,
        is_active=True,
        is_superuser=False,
        is_admin=False,  # Explicitly set to False for regular registration
        subscription_status=SubscriptionStatus.TRIAL,
        trial_ends_at=trial_end_date,
        last_login=datetime.utcnow()
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"New user registered: {new_user.email}")
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(new_user.id), "email": new_user.email}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(new_user)
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with email and password
    
    - Validates credentials
    - Returns access token
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    logger.info(f"User logged in: {user.email}")
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user information
    
    - Requires authentication
    - Returns user profile
    """
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user)
):
    """
    Logout current user
    
    Note: Since we're using stateless JWT tokens, 
    actual logout happens on the client side by removing the token.
    This endpoint is just for consistency and potential future use.
    """
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out"}


@router.post("/organization/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_organization_and_user(
    data: OrganizationRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new organization with an initial admin user
    
    This is a convenience endpoint for onboarding new organizations.
    """
    # Validate email
    if not validate_email(data.user_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password
    is_valid, error_msg = validate_password_strength(data.user_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Check if organization slug already exists
    existing_org = db.query(Organization).filter(Organization.slug == data.org_slug).first()
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization slug already exists"
        )
    
    # Check if user email already exists
    existing_user = db.query(User).filter(User.email == data.user_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create organization
        new_org = Organization(
            name=data.org_name,
            slug=data.org_slug,
            is_active=True
        )
        db.add(new_org)
        db.flush()  # Get the organization ID
        
        # Calculate trial end date
        trial_end_date = datetime.now(timezone.utc) + timedelta(days=new_org.trial_period_days)
        
        # Create admin user
        hashed_password = get_password_hash(data.user_password)
        new_user = User(
            email=data.user_email,
            hashed_password=hashed_password,
            full_name=data.user_full_name,
            organization_id=new_org.id,
            is_active=True,
            is_superuser=True,  # First user is admin
            is_admin=True,  # First user is also admin
            subscription_status=SubscriptionStatus.TRIAL,
            trial_ends_at=trial_end_date,
            last_login=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_org)
        db.refresh(new_user)
        
        logger.info(f"New organization registered: {new_org.name} with admin user: {new_user.email}")
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(new_user.id), "email": new_user.email}
        )
        
        return {
            "message": "Organization and user created successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "organization": OrganizationResponse.model_validate(new_org),
            "user": UserResponse.model_validate(new_user)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering organization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register organization"
        )
