from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import cv2
import os
import numpy as np
import base64
import json
import time
from pathlib import Path
import threading
import queue
from datetime import datetime
from io import BytesIO
from PIL import Image
from security_manager import SecurityManager
from database_manager import DatabaseManager
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize security and database managers
security_manager = SecurityManager()
database_manager = DatabaseManager()

# Global variables for video capture
video_capture = None
is_recording = False
recorded_frames = []
frame_queue = queue.Queue()

class FaceRecognitionAPI:
    def __init__(self, dataset_path="./dataset"):
        self.dataset_path = dataset_path
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.known_faces = []
        self.known_names = []
        self.is_loaded = False

        # Initialize security and database
        self.security = security_manager
        self.database = database_manager

        logger.info(f"Face Recognition API initialized with dataset path: {dataset_path}")
        logger.info("Security encryption enabled for all data storage")
        
    def load_dataset(self):
        """Load faces from dataset (database first, then filesystem)"""
        logger.info("Loading dataset for API...")

        self.known_faces = []
        self.known_names = []

        try:
            # First, try to load from database
            faces_from_db = self.database.get_all_faces()

            if faces_from_db:
                logger.info(f"Loading {len(faces_from_db)} faces from secure database")
                for face_record in faces_from_db:
                    # Convert bytes to OpenCV image
                    nparr = np.frombuffer(face_record['image_data'], np.uint8)
                    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if image is not None:
                        # Process face for recognition
                        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)

                        if len(faces) > 0:
                            (x, y, w, h) = faces[0]
                            face = gray[y:y+h, x:x+w]
                            face = cv2.resize(face, (100, 100))

                            self.known_faces.append(face)
                            self.known_names.append(face_record['person_name'])

                self.is_loaded = len(self.known_faces) > 0
                return self.is_loaded, f"Loaded {len(self.known_faces)} faces from secure database"

            # If no faces in database, load from filesystem and store in database
            logger.info("No faces in database, loading from filesystem...")
            dataset_dir = Path(self.dataset_path)
            if not dataset_dir.exists():
                return False, "Dataset directory not found"

            image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
            loaded_count = 0

            for image_path in dataset_dir.iterdir():
                if image_path.suffix.lower() in image_extensions:
                    try:
                        name = image_path.stem.rsplit('_', 1)[0]

                        image = cv2.imread(str(image_path))
                        if image is None:
                            continue

                        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)

                        if len(faces) > 0:
                            (x, y, w, h) = faces[0]
                            face = gray[y:y+h, x:x+w]
                            face = cv2.resize(face, (100, 100))

                            # Convert original image to bytes for storage
                            _, buffer = cv2.imencode('.jpg', image)
                            image_bytes = buffer.tobytes()

                            # Store in secure database
                            face_id = self.database.store_face_image(
                                person_name=name,
                                image_data=image_bytes,
                                metadata={'source_file': str(image_path), 'loaded_at': datetime.now().isoformat()}
                            )

                            # Store in memory for immediate use
                            self.known_faces.append(face)
                            self.known_names.append(name)
                            loaded_count += 1

                            logger.debug(f"Stored face {name} with ID {face_id}")

                    except Exception as e:
                        logger.error(f"Error loading {image_path}: {e}")
                        continue

            self.is_loaded = loaded_count > 0
            logger.info(f"Loaded and stored {loaded_count} faces in secure database")
            return self.is_loaded, f"Loaded {loaded_count} faces and stored securely"

        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            return False, f"Error loading dataset: {str(e)}"
    
    def compare_faces(self, face1, face2):
        """Compare two faces"""
        face1 = cv2.resize(face1, (100, 100))
        face2 = cv2.resize(face2, (100, 100))
        result = cv2.matchTemplate(face1, face2, cv2.TM_CCOEFF_NORMED)
        return result[0][0]
    
    def recognize_face(self, face_image):
        """Recognize a face"""
        if not self.is_loaded or len(self.known_faces) == 0:
            return "Unknown", 0
        
        best_match_score = -1
        best_match_name = "Unknown"
        
        face_resized = cv2.resize(face_image, (100, 100))
        
        for i, known_face in enumerate(self.known_faces):
            score = self.compare_faces(face_resized, known_face)
            if score > best_match_score:
                best_match_score = score
                best_match_name = self.known_names[i]
        
        confidence = best_match_score * 100
        if best_match_score < 0.6:
            best_match_name = "Unknown"
            confidence = 0
        
        return best_match_name, confidence
    
    def process_frame(self, frame):
        """Process a single frame and return detection results"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=3,
            minSize=(30, 30),
            maxSize=(300, 300)
        )
        
        results = []
        annotated_frame = frame.copy()
        
        for (x, y, w, h) in faces:
            face = gray[y:y+h, x:x+w]
            name, confidence = self.recognize_face(face)
            
            # Color coding
            if name != "Unknown" and confidence > 70:
                color = (0, 255, 0)  # Green
                thickness = 3
            elif name != "Unknown" and confidence > 50:
                color = (0, 255, 255)  # Yellow
                thickness = 2
            else:
                color = (0, 0, 255)  # Red
                thickness = 2
            
            # Draw on frame
            cv2.rectangle(annotated_frame, (x, y), (x+w, y+h), color, thickness)
            cv2.rectangle(annotated_frame, (x, y+h-35), (x+w, y+h), color, cv2.FILLED)
            
            label = f"{name}"
            if confidence > 0:
                label += f" ({confidence:.1f}%)"
            
            cv2.putText(annotated_frame, label, (x+6, y+h-6), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
            
            results.append({
                "name": name,
                "confidence": round(confidence, 2),
                "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
            })
        
        return results, annotated_frame

# Initialize face recognition
face_recognizer = FaceRecognitionAPI(dataset_path="./dataset/images")

@app.route('/', methods=['GET'])
def index():
    """Web interface for the API"""
    return render_template('index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "face_recognition_loaded": face_recognizer.is_loaded,
        "features": {
            "face_recognition": True,
            "video_processing": True,
            "database_storage": True,
            "encryption": True,
            "attendance_tracking": True
        }
    })

@app.route('/api/attendance/records', methods=['GET'])
def get_attendance_records():
    """Get attendance records with optional filtering"""
    try:
        # Get query parameters
        date = request.args.get('date')  # YYYY-MM-DD format
        person_name = request.args.get('person_name')

        # Get records from database
        records = database_manager.get_attendance_records(date=date, person_name=person_name)

        return jsonify({
            'success': True,
            'records': records,
            'count': len(records),
            'filters': {
                'date': date,
                'person_name': person_name
            }
        })

    except Exception as e:
        logger.error(f"Failed to get attendance records: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/summary', methods=['GET'])
def get_attendance_summary():
    """Get attendance summary for a specific date"""
    try:
        # Get date parameter (defaults to today)
        date = request.args.get('date')  # YYYY-MM-DD format

        # Get summary from database
        summary = database_manager.get_attendance_summary(date=date)

        return jsonify({
            'success': True,
            'summary': summary,
            'date': date or datetime.now().strftime('%Y-%m-%d'),
            'total_people': len(summary)
        })

    except Exception as e:
        logger.error(f"Failed to get attendance summary: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/record', methods=['POST'])
def record_attendance():
    """Manually record attendance for a person"""
    try:
        data = request.get_json()

        if not data or 'person_name' not in data:
            return jsonify({'error': 'person_name is required'}), 400

        person_name = data['person_name']
        confidence = data.get('confidence', 1.0)
        location = data.get('location', 'Manual Entry')
        device_info = data.get('device_info', {'method': 'manual'})

        # Record attendance
        attendance_id = database_manager.record_attendance(
            person_name=person_name,
            confidence=confidence,
            location=location,
            device_info=device_info
        )

        return jsonify({
            'success': True,
            'message': f'Attendance recorded for {person_name}',
            'attendance_id': attendance_id,
            'person_name': person_name,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Failed to record attendance: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/load-dataset', methods=['POST'])
def load_dataset():
    """Load the face recognition dataset"""
    try:
        success, message = face_recognizer.load_dataset()
        return jsonify({
            "success": success,
            "message": message,
            "faces_loaded": len(face_recognizer.known_faces),
            "unique_people": len(set(face_recognizer.known_names))
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/start-recording', methods=['POST'])
def start_recording():
    """Start video recording from webcam"""
    global video_capture, is_recording, recorded_frames
    
    try:
        data = request.get_json() or {}
        camera_index = data.get('camera_index', 1)
        duration = data.get('duration', 10)  # seconds
        
        if is_recording:
            return jsonify({"success": False, "error": "Already recording"}), 400
        
        # Initialize camera
        video_capture = cv2.VideoCapture(camera_index)
        if not video_capture.isOpened():
            video_capture = cv2.VideoCapture(0)  # Fallback
            if not video_capture.isOpened():
                return jsonify({"success": False, "error": "Cannot open camera"}), 500
        
        recorded_frames = []
        is_recording = True
        
        # Start recording in background thread
        def record_video():
            global is_recording, recorded_frames
            start_time = time.time()
            
            while is_recording and (time.time() - start_time) < duration:
                ret, frame = video_capture.read()
                if ret:
                    recorded_frames.append(frame.copy())
                time.sleep(0.033)  # ~30 FPS
            
            is_recording = False
            if video_capture:
                video_capture.release()
        
        threading.Thread(target=record_video, daemon=True).start()
        
        return jsonify({
            "success": True,
            "message": f"Recording started for {duration} seconds",
            "camera_index": camera_index
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/stop-recording', methods=['POST'])
def stop_recording():
    """Stop video recording"""
    global is_recording, video_capture
    
    try:
        if not is_recording:
            return jsonify({"success": False, "error": "Not currently recording"}), 400
        
        is_recording = False
        if video_capture:
            video_capture.release()
            video_capture = None
        
        return jsonify({
            "success": True,
            "message": "Recording stopped",
            "frames_captured": len(recorded_frames)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/recording-status', methods=['GET'])
def recording_status():
    """Get current recording status"""
    return jsonify({
        "is_recording": is_recording,
        "frames_captured": len(recorded_frames),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/extract-frames', methods=['POST'])
def extract_frames():
    """Extract frames from recorded video"""
    global recorded_frames
    
    try:
        if not recorded_frames:
            return jsonify({"success": False, "error": "No recorded frames available"}), 400
        
        data = request.get_json() or {}
        frame_interval = data.get('frame_interval', 5)  # Extract every 5th frame
        
        # Create frames directory
        frames_dir = Path("./extracted_frames")
        frames_dir.mkdir(exist_ok=True)
        
        # Clear previous frames
        for f in frames_dir.glob("*.jpg"):
            f.unlink()
        
        extracted_frames = []
        for i in range(0, len(recorded_frames), frame_interval):
            frame = recorded_frames[i]
            filename = f"frame_{i:04d}.jpg"
            filepath = frames_dir / filename
            
            cv2.imwrite(str(filepath), frame)
            extracted_frames.append({
                "frame_number": i,
                "filename": filename,
                "filepath": str(filepath)
            })
        
        return jsonify({
            "success": True,
            "message": f"Extracted {len(extracted_frames)} frames",
            "frames": extracted_frames,
            "frames_directory": str(frames_dir)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/process-frame', methods=['POST'])
def process_frame_api():
    """Process a single frame for face recognition"""
    try:
        if not face_recognizer.is_loaded:
            return jsonify({"success": False, "error": "Face recognition model not loaded"}), 400
        
        # Handle different input types
        if 'frame_file' in request.files:
            # File upload
            file = request.files['frame_file']
            file_bytes = np.frombuffer(file.read(), np.uint8)
            frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        elif 'frame_path' in request.json:
            # File path
            frame_path = request.json['frame_path']
            frame = cv2.imread(frame_path)
        elif 'frame_base64' in request.json:
            # Base64 encoded image
            img_data = base64.b64decode(request.json['frame_base64'])
            file_bytes = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        else:
            return jsonify({"success": False, "error": "No frame data provided"}), 400
        
        if frame is None:
            return jsonify({"success": False, "error": "Could not decode frame"}), 400
        
        # Process frame
        results, annotated_frame = face_recognizer.process_frame(frame)
        
        # Encode annotated frame as base64
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        annotated_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            "success": True,
            "detections": results,
            "faces_found": len(results),
            "annotated_frame_base64": annotated_base64,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/process-all-frames', methods=['POST'])
def process_all_frames():
    """Process all extracted frames for face recognition"""
    try:
        if not face_recognizer.is_loaded:
            return jsonify({"success": False, "error": "Face recognition model not loaded"}), 400
        
        frames_dir = Path("./extracted_frames")
        if not frames_dir.exists():
            return jsonify({"success": False, "error": "No extracted frames found"}), 400
        
        results = []
        frame_files = sorted(frames_dir.glob("*.jpg"))
        
        for frame_file in frame_files:
            frame = cv2.imread(str(frame_file))
            if frame is not None:
                detections, annotated_frame = face_recognizer.process_frame(frame)
                
                # Save annotated frame
                annotated_path = frames_dir / f"annotated_{frame_file.name}"
                cv2.imwrite(str(annotated_path), annotated_frame)
                
                results.append({
                    "frame_file": frame_file.name,
                    "detections": detections,
                    "faces_found": len(detections),
                    "annotated_frame": str(annotated_path)
                })
        
        return jsonify({
            "success": True,
            "message": f"Processed {len(results)} frames",
            "results": results,
            "total_faces_detected": sum(r["faces_found"] for r in results)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    import os

    print("🚀 Starting Face Recognition API Server...")
    print("📡 Available endpoints:")
    print("   GET  /api/health - Health check")
    print("   POST /api/load-dataset - Load face recognition dataset")
    print("   POST /api/start-recording - Start video recording")
    print("   POST /api/stop-recording - Stop video recording")
    print("   GET  /api/recording-status - Get recording status")
    print("   POST /api/extract-frames - Extract frames from video")
    print("   POST /api/process-frame - Process single frame")
    print("   POST /api/process-all-frames - Process all extracted frames")

    # Get port from environment variable (for deployment) or default to 5000
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'

    app.run(debug=debug, host='0.0.0.0', port=port)
