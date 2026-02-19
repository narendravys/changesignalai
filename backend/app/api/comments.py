"""
API endpoints for comments
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_with_subscription
from app.models.user import User
from app.models.comment import Comment
from app.models.change_event import ChangeEvent
from app.schemas.comment import CommentCreate, CommentResponse
from datetime import datetime

router = APIRouter()


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Create a new comment on a change event"""
    
    # Verify change event exists and belongs to user's organization
    change_event = db.query(ChangeEvent).filter(
        ChangeEvent.id == comment_data.change_event_id
    ).first()
    
    if not change_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Change event not found"
        )
    
    # Create comment
    comment = Comment(
        change_event_id=comment_data.change_event_id,
        user_id=current_user.id,
        content=comment_data.content,
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Add user information to response
    response = CommentResponse.model_validate(comment)
    response.user_name = current_user.full_name or current_user.email
    response.user_email = current_user.email
    
    return response


@router.get("/change-event/{change_event_id}", response_model=List[CommentResponse])
def get_comments_for_change(
    change_event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Get all comments for a change event"""
    
    # Verify change event exists
    change_event = db.query(ChangeEvent).filter(
        ChangeEvent.id == change_event_id
    ).first()
    
    if not change_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Change event not found"
        )
    
    # Get comments
    comments = db.query(Comment).filter(
        Comment.change_event_id == change_event_id
    ).order_by(Comment.created_at.asc()).all()
    
    # Enhance with user information
    result = []
    for comment in comments:
        comment_dict = CommentResponse.model_validate(comment).model_dump()
        comment_dict["user_name"] = comment.user.full_name or comment.user.email
        comment_dict["user_email"] = comment.user.email
        result.append(CommentResponse(**comment_dict))
    
    return result


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_subscription),
):
    """Delete a comment (only the comment author can delete)"""
    
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check if current user is the comment author
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )
    
    db.delete(comment)
    db.commit()
    
    return None
