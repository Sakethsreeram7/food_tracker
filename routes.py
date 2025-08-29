from datetime import datetime, date, time, timedelta
from flask import Blueprint, request, jsonify, render_template, send_from_directory, current_app, url_for
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
import qrcode
from io import BytesIO
import base64
import os
import uuid
import pytz

from __init__ import db
from models import User, MealType, DailyQRCode, UserMealOptIn, WeeklyOptIn, OptInSchedule

# Create blueprint
main_bp = Blueprint('main', __name__)

# Routes
@main_bp.route('/')
def index():
    return render_template('index.html')

# Authentication routes
@main_bp.route('/login')
def login():
    return render_template('index.html')

@main_bp.route('/unauthorized')
def unauthorized():
    return jsonify({'success': False, 'message': 'Please log in to access this page'}), 401

@main_bp.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    
    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'is_admin': user.is_admin
            }
        })
    
    return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

@main_bp.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True})

# User routes
@main_bp.route('/api/user', methods=['GET'])
@login_required
def get_user():
    return jsonify({
        'id': current_user.id,
        'name': current_user.name,
        'email': current_user.email,
        'is_admin': current_user.is_admin
    })

# Legacy opt-in route - redirects to new meal opt-in system
@main_bp.route('/api/opt-in', methods=['POST'])
@login_required
def opt_in():
    return jsonify({
        'success': False,
        'message': 'This endpoint is deprecated. Please use /api/meals/opt-in instead.'
    }), 400

# QR Code routes
@main_bp.route('/api/qr-code', methods=['GET'])
@login_required
def get_qr_code():
    # Generate QR code with the verification URL
    verification_url = f"{request.host_url}api/verify/{current_user.id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 for embedding in HTML
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return jsonify({
        'qr_code': f"data:image/png;base64,{img_str}",
        'verification_url': verification_url
    })

# Legacy verify route - redirects to new verification system
@main_bp.route('/api/verify/<int:user_id>', methods=['GET'])
def verify(user_id):
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    return jsonify({
        'success': False,
        'message': 'This endpoint is deprecated. Please use /api/verify-meal instead.',
        'user': {
            'name': user.name
        }
    })

# Admin routes
# Legacy opted-users route - redirects to new meal opt-in system
@main_bp.route('/api/admin/opted-users', methods=['GET'])
@login_required
def get_opted_users():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    return jsonify({
        'success': False,
        'message': 'This endpoint is deprecated. Please use /api/admin/opted-meals instead.'
    }), 400

# Legacy reset-daily route - redirects to new meal opt-in system
@main_bp.route('/api/admin/reset-daily', methods=['POST'])
@login_required
def reset_daily():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    return jsonify({
        'success': False,
        'message': 'This endpoint is deprecated. Please use the new meal opt-in system.'
    }), 400

# Legacy export-csv route - redirects to new meal opt-in system
@main_bp.route('/api/admin/export-csv', methods=['GET'])
@login_required
def export_csv():
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    return jsonify({
        'success': False,
        'message': 'This endpoint is deprecated. Please use the export feature in the admin dashboard.'
    }), 400

# Helper functions for meal opt-in system
def get_ist_now():
    """Get current datetime in IST timezone"""
    ist = pytz.timezone('Asia/Kolkata')
    # Create a timezone-aware datetime in IST
    utc_now = datetime.now(pytz.UTC)
    return utc_now.astimezone(ist)

def is_opt_in_open(target_date=None):
    """Check if opt-in is currently open for the given date"""
    # Always get fresh schedule data from the database
    db.session.expire_all()  # Invalidate any cached data
    
    ist_now = get_ist_now()
    
    # Default to checking for tomorrow if no date specified
    if target_date is None:
        target_date = (ist_now + timedelta(days=1)).date()
    
    # Get day of week (0=Monday, 6=Sunday)
    today_dow = ist_now.weekday()
    target_dow = target_date.weekday()
    
    # Get current time
    current_time = ist_now.time()
    
    # Check if it's a weekend
    is_weekend = today_dow >= 4  # Friday, Saturday, Sunday
    
    if is_weekend:
        # Weekend rules
        weekend_schedule = OptInSchedule.query.filter_by(is_weekend_rule=True).first()
        if weekend_schedule:
            # Friday 8 PM to Sunday 4 PM for weekend meals
            if today_dow == 4:  # Friday
                # After 8 PM on Friday
                return current_time >= weekend_schedule.open_time
            elif today_dow == 5:  # Saturday
                # All day Saturday
                return True
            elif today_dow == 6:  # Sunday
                # Before 4 PM on Sunday
                return current_time < weekend_schedule.close_time
    else:
        # Weekday rules
        weekday_schedule = OptInSchedule.query.filter_by(day_of_week=today_dow, is_weekend_rule=False).first()
        if weekday_schedule:
            # 8 PM to 9 AM next day
            if current_time >= weekday_schedule.open_time or current_time < weekday_schedule.close_time:
                # Check if target date is tomorrow
                tomorrow = (ist_now + timedelta(days=1)).date()
                return target_date == tomorrow
    
    return False

def generate_daily_qr_code(for_date=None):
    """Generate QR code for a specific date"""
    if for_date is None:
        for_date = date.today()
    
    # Check if QR code already exists for this date
    existing_qr = DailyQRCode.query.filter_by(date=for_date).first()
    if existing_qr:
        return existing_qr
    
    # Generate a unique token
    token = str(uuid.uuid4())
    
    # Create verification URL
    verification_url = f"{request.host_url}verify-meal/{for_date.isoformat()}/{token}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Create directory for QR codes if it doesn't exist
    qr_dir = os.path.join(current_app.static_folder, 'qr_codes')
    if not os.path.exists(qr_dir):
        os.makedirs(qr_dir)
    
    # Save QR code image
    filename = f"qr_{for_date.isoformat()}.png"
    filepath = os.path.join(qr_dir, filename)
    img.save(filepath)
    
    # Save to database
    relative_path = f"qr_codes/{filename}"
    new_qr = DailyQRCode(
        date=for_date,
        qr_image_path=relative_path,
        token=token,
        created_at=datetime.utcnow()
    )
    
    db.session.add(new_qr)
    db.session.commit()
    
    return new_qr

# New meal opt-in routes
@main_bp.route('/api/meals', methods=['GET'])
@login_required
def get_meal_types():
    """Get all available meal types"""
    meal_types = MealType.query.all()
    return jsonify({
        'success': True,
        'meal_types': [{'id': m.id, 'name': m.name} for m in meal_types]
    })

@main_bp.route('/api/meals/opt-in-status', methods=['GET'])
@login_required
def get_opt_in_status():
    """Get opt-in status for current user"""
    # Get date parameter or default to tomorrow
    target_date_str = request.args.get('date')
    if target_date_str:
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'}), 400
    else:
        # Default to tomorrow
        target_date = (get_ist_now() + timedelta(days=1)).date()
    
    # Get all meal types
    meal_types = MealType.query.all()
    
    # Get user's opt-ins for the target date
    user_opt_ins = UserMealOptIn.query.filter_by(
        user_id=current_user.id,
        date=target_date
    ).all()
    
    # Create a map of meal_type_id to opt_in status
    opt_in_map = {oi.meal_type_id: oi.opted_in for oi in user_opt_ins}
    
    # Check if opt-in is currently open
    is_open = is_opt_in_open(target_date)
    
    # Format response
    meals_data = []
    for meal in meal_types:
        opted_in = opt_in_map.get(meal.id, False)
        meals_data.append({
            'meal_type_id': meal.id,
            'name': meal.name,
            'opted_in': opted_in
        })
    
    return jsonify({
        'success': True,
        'date': target_date.isoformat(),
        'is_opt_in_open': is_open,
        'meals': meals_data
    })

@main_bp.route('/api/meals/opt-in', methods=['POST'])
@login_required
def meal_opt_in():
    """Opt in/out for a specific meal on a specific date"""
    data = request.get_json()
    meal_type_id = data.get('meal_type_id')
    target_date_str = data.get('date')
    opted_in = data.get('opted_in', False)
    
    # Validate meal type
    meal_type = MealType.query.get(meal_type_id)
    if not meal_type:
        return jsonify({'success': False, 'message': 'Invalid meal type'}), 400
    
    # Parse date
    try:
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400
    
    # Check if opt-in is open for this date
    if not is_opt_in_open(target_date):
        return jsonify({
            'success': False, 
            'message': 'Opt-in is closed for this date'
        }), 403
    
    # Get or create user meal opt-in record
    user_opt_in = UserMealOptIn.query.filter_by(
        user_id=current_user.id,
        meal_type_id=meal_type_id,
        date=target_date
    ).first()
    
    if user_opt_in:
        user_opt_in.opted_in = opted_in
        user_opt_in.timestamp = datetime.utcnow()
    else:
        user_opt_in = UserMealOptIn(
            user_id=current_user.id,
            meal_type_id=meal_type_id,
            date=target_date,
            opted_in=opted_in,
            timestamp=datetime.utcnow()
        )
        db.session.add(user_opt_in)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'meal_type_id': meal_type_id,
        'date': target_date.isoformat(),
        'opted_in': opted_in
    })

@main_bp.route('/api/meals/weekly-opt-in', methods=['POST'])
@login_required
def weekly_opt_in():
    """Set weekly opt-in preferences for a meal type"""
    data = request.get_json()
    meal_type_id = data.get('meal_type_id')
    days = data.get('days', {})
    
    # Validate meal type
    meal_type = MealType.query.get(meal_type_id)
    if not meal_type:
        return jsonify({'success': False, 'message': 'Invalid meal type'}), 400
    
    # Get or create weekly opt-in record
    weekly = WeeklyOptIn.query.filter_by(
        user_id=current_user.id,
        meal_type_id=meal_type_id
    ).first()
    
    if not weekly:
        weekly = WeeklyOptIn(
            user_id=current_user.id,
            meal_type_id=meal_type_id
        )
        db.session.add(weekly)
    
    # Update days
    weekly.monday = days.get('monday', weekly.monday)
    weekly.tuesday = days.get('tuesday', weekly.tuesday)
    weekly.wednesday = days.get('wednesday', weekly.wednesday)
    weekly.thursday = days.get('thursday', weekly.thursday)
    weekly.friday = days.get('friday', weekly.friday)
    weekly.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    # Apply weekly preferences to future dates that are open for opt-in
    ist_now = get_ist_now()
    for i in range(1, 6):  # Look ahead 5 days
        future_date = (ist_now + timedelta(days=i)).date()
        future_dow = future_date.weekday()  # 0=Monday, 6=Sunday
        
        # Skip weekends
        if future_dow > 4:  # Saturday or Sunday
            continue
        
        # Check if this day is selected in weekly preferences
        is_selected = False
        if future_dow == 0 and weekly.monday:
            is_selected = True
        elif future_dow == 1 and weekly.tuesday:
            is_selected = True
        elif future_dow == 2 and weekly.wednesday:
            is_selected = True
        elif future_dow == 3 and weekly.thursday:
            is_selected = True
        elif future_dow == 4 and weekly.friday:
            is_selected = True
        
        # Check if opt-in is open for this date
        if is_selected and is_opt_in_open(future_date):
            # Get or create user meal opt-in record
            user_opt_in = UserMealOptIn.query.filter_by(
                user_id=current_user.id,
                meal_type_id=meal_type_id,
                date=future_date
            ).first()
            
            if user_opt_in:
                user_opt_in.opted_in = True
                user_opt_in.timestamp = datetime.utcnow()
            else:
                user_opt_in = UserMealOptIn(
                    user_id=current_user.id,
                    meal_type_id=meal_type_id,
                    date=future_date,
                    opted_in=True,
                    timestamp=datetime.utcnow()
                )
                db.session.add(user_opt_in)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'meal_type_id': meal_type_id,
        'days': {
            'monday': weekly.monday,
            'tuesday': weekly.tuesday,
            'wednesday': weekly.wednesday,
            'thursday': weekly.thursday,
            'friday': weekly.friday
        }
    })

@main_bp.route('/api/meals/weekly-status', methods=['GET'])
@login_required
def get_weekly_status():
    """Get weekly opt-in preferences for current user"""
    meal_types = MealType.query.all()
    result = []
    
    for meal in meal_types:
        weekly = WeeklyOptIn.query.filter_by(
            user_id=current_user.id,
            meal_type_id=meal.id
        ).first()
        
        if weekly:
            result.append({
                'meal_type_id': meal.id,
                'name': meal.name,
                'days': {
                    'monday': weekly.monday,
                    'tuesday': weekly.tuesday,
                    'wednesday': weekly.wednesday,
                    'thursday': weekly.thursday,
                    'friday': weekly.friday
                }
            })
        else:
            result.append({
                'meal_type_id': meal.id,
                'name': meal.name,
                'days': {
                    'monday': False,
                    'tuesday': False,
                    'wednesday': False,
                    'thursday': False,
                    'friday': False
                }
            })
    
    return jsonify({
        'success': True,
        'weekly_preferences': result
    })

# Daily QR code routes
@main_bp.route('/verify-meal/<date_str>/<token>', methods=['GET'])
def verify_meal(date_str, token):
    """Public verification page for daily QR code"""
    # Render the verification page
    return render_template('index.html')

@main_bp.route('/api/verify-meal/<date_str>/<token>', methods=['GET'])
def api_verify_meal(date_str, token):
    """API endpoint for meal verification"""
    try:
        verify_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400
    
    # Find QR code for this date and token
    qr_code = DailyQRCode.query.filter_by(date=verify_date, token=token).first()
    if not qr_code:
        return jsonify({'success': False, 'message': 'Invalid QR code'}), 404
    
    # Get user ID from request if available
    user_id = request.args.get('user_id')
    user = None
    
    if user_id:
        user = User.query.get(user_id)
    elif current_user.is_authenticated:
        user = current_user
    
    if not user:
        return jsonify({
            'success': True,
            'date': verify_date.isoformat(),
            'message': 'Please log in to see your meal status',
            'requires_login': True
        })
    
    # Get user's meal opt-ins for this date
    user_opt_ins = UserMealOptIn.query.filter_by(
        user_id=user.id,
        date=verify_date
    ).all()
    
    # Get all meal types
    meal_types = MealType.query.all()
    
    # Create a map of meal_type_id to opt_in status
    opt_in_map = {oi.meal_type_id: oi.opted_in for oi in user_opt_ins}
    
    # Format response
    meals_data = []
    for meal in meal_types:
        opted_in = opt_in_map.get(meal.id, False)
        meals_data.append({
            'meal_type_id': meal.id,
            'name': meal.name,
            'opted_in': opted_in
        })
    
    return jsonify({
        'success': True,
        'date': verify_date.isoformat(),
        'user': {
            'name': user.name,
            'email': user.email
        },
        'meals': meals_data
    })

# Enhanced admin routes
@main_bp.route('/api/admin/daily-qr', methods=['GET'])
@login_required
def get_daily_qr():
    """Get daily QR code for admin"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get date parameter or default to today
    date_str = request.args.get('date')
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'}), 400
    else:
        target_date = date.today()
    
    # Get or generate QR code
    qr_code = DailyQRCode.query.filter_by(date=target_date).first()
    if not qr_code:
        qr_code = generate_daily_qr_code(target_date)
    
    # Generate URL for QR code image
    qr_image_url = url_for('static', filename=qr_code.qr_image_path)
    verification_url = f"{request.host_url}verify-meal/{target_date.isoformat()}/{qr_code.token}"
    
    return jsonify({
        'success': True,
        'date': target_date.isoformat(),
        'qr_code_url': qr_image_url,
        'verification_url': verification_url
    })

@main_bp.route('/api/admin/regenerate-qr', methods=['POST'])
@login_required
def regenerate_daily_qr():
    """Regenerate QR code for a specific date"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    date_str = data.get('date')
    
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400
    
    # Delete existing QR code if it exists
    existing_qr = DailyQRCode.query.filter_by(date=target_date).first()
    if existing_qr:
        # Delete the image file if it exists
        if existing_qr.qr_image_path:
            file_path = os.path.join(current_app.static_folder, existing_qr.qr_image_path)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        db.session.delete(existing_qr)
        db.session.commit()
    
    # Generate new QR code
    new_qr = generate_daily_qr_code(target_date)
    
    # Generate URL for QR code image
    qr_image_url = url_for('static', filename=new_qr.qr_image_path)
    verification_url = f"{request.host_url}verify-meal/{target_date.isoformat()}/{new_qr.token}"
    
    return jsonify({
        'success': True,
        'date': target_date.isoformat(),
        'qr_code_url': qr_image_url,
        'verification_url': verification_url,
        'message': 'QR code regenerated successfully'
    })

@main_bp.route('/api/admin/opted-meals', methods=['GET'])
@login_required
def get_opted_meals():
    """Get all users opted in for meals on a specific date"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get date parameter or default to today
    date_str = request.args.get('date')
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'}), 400
    else:
        target_date = date.today()
    
    # Get meal type filter if provided
    meal_type_id = request.args.get('meal_type_id')
    
    # Query for opted-in users
    query = db.session.query(User, UserMealOptIn, MealType)\
        .join(UserMealOptIn, User.id == UserMealOptIn.user_id)\
        .join(MealType, UserMealOptIn.meal_type_id == MealType.id)\
        .filter(UserMealOptIn.date == target_date, UserMealOptIn.opted_in == True)
    
    if meal_type_id:
        query = query.filter(UserMealOptIn.meal_type_id == meal_type_id)
    
    results = query.all()
    
    # Organize results by meal type
    meal_types = {}
    for user, opt_in, meal_type in results:
        if meal_type.id not in meal_types:
            meal_types[meal_type.id] = {
                'id': meal_type.id,
                'name': meal_type.name,
                'users': []
            }
        
        meal_types[meal_type.id]['users'].append({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'opt_in_time': opt_in.timestamp.isoformat() if opt_in.timestamp else None
        })
    
    return jsonify({
        'success': True,
        'date': target_date.isoformat(),
        'meal_types': list(meal_types.values())
    })

@main_bp.route('/api/admin/schedules', methods=['GET'])
@login_required
def get_schedules():
    """Get all opt-in schedules"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get all schedules
    schedules = OptInSchedule.query.all()
    
    # Format schedules for response
    weekday_schedules = []
    weekend_schedules = []
    
    for schedule in schedules:
        schedule_data = {
            'id': schedule.id,
            'day_of_week': schedule.day_of_week,
            'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][schedule.day_of_week],
            'open_time': schedule.open_time.strftime('%H:%M'),
            'close_time': schedule.close_time.strftime('%H:%M'),
            'is_weekend_rule': schedule.is_weekend_rule
        }
        
        if schedule.is_weekend_rule:
            weekend_schedules.append(schedule_data)
        else:
            weekday_schedules.append(schedule_data)
    
    return jsonify({
        'success': True,
        'weekday_schedules': sorted(weekday_schedules, key=lambda x: x['day_of_week']),
        'weekend_schedules': sorted(weekend_schedules, key=lambda x: x['day_of_week'])
    })

@main_bp.route('/api/admin/schedules/<int:schedule_id>', methods=['PUT'])
@login_required
def update_schedule(schedule_id):
    """Update an opt-in schedule"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get schedule
    schedule = OptInSchedule.query.get(schedule_id)
    if not schedule:
        return jsonify({'success': False, 'message': 'Schedule not found'}), 404
    
    # Get data from request
    data = request.get_json()
    open_time_str = data.get('open_time')
    close_time_str = data.get('close_time')
    
    # Validate times
    try:
        open_time = datetime.strptime(open_time_str, '%H:%M').time()
        close_time = datetime.strptime(close_time_str, '%H:%M').time()
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid time format. Use HH:MM format.'}), 400
    
    # Update schedule
    schedule.open_time = open_time
    schedule.close_time = close_time
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'schedule': {
            'id': schedule.id,
            'day_of_week': schedule.day_of_week,
            'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][schedule.day_of_week],
            'open_time': schedule.open_time.strftime('%H:%M'),
            'close_time': schedule.close_time.strftime('%H:%M'),
            'is_weekend_rule': schedule.is_weekend_rule
        }
    })

@main_bp.route('/api/admin/historical-data', methods=['GET'])
@login_required
def get_historical_data():
    """Get historical data for the past 2 months"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Calculate date range (today - 2 months)
    end_date = date.today()
    start_date = end_date - timedelta(days=60)  # Approximately 2 months
    
    # Get meal type filter if provided
    meal_type_id = request.args.get('meal_type_id')
    
    # Query for historical data
    query = db.session.query(
            UserMealOptIn.date,
            MealType.id,
            MealType.name,
            db.func.count(UserMealOptIn.id).label('total_opt_ins')
        )\
        .join(MealType, UserMealOptIn.meal_type_id == MealType.id)\
        .filter(
            UserMealOptIn.date.between(start_date, end_date),
            UserMealOptIn.opted_in == True
        )\
        .group_by(UserMealOptIn.date, MealType.id, MealType.name)
    
    if meal_type_id:
        query = query.filter(UserMealOptIn.meal_type_id == meal_type_id)
    
    results = query.all()
    
    # Organize results by date
    historical_data = {}
    for result_date, meal_id, meal_name, count in results:
        date_str = result_date.isoformat()
        if date_str not in historical_data:
            historical_data[date_str] = {
                'date': date_str,
                'meals': []
            }
        
        historical_data[date_str]['meals'].append({
            'meal_type_id': meal_id,
            'name': meal_name,
            'count': count
        })
    
    return jsonify({
        'success': True,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'data': list(historical_data.values())
    })

# Serve React static files
@main_bp.route('/<path:path>')
def serve_static(path):
    return send_from_directory(current_app.static_folder, path)
