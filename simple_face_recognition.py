import cv2
import os
import numpy as np
from pathlib import Path

class SimpleFaceRecognition:
    def __init__(self, dataset_path="./dataset"):
        self.dataset_path = dataset_path
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.known_faces = []
        self.known_names = []
        
    def load_dataset(self):
        """Load and process faces from the dataset"""
        print("Loading faces from dataset...")
        
        # Get all image files from dataset
        dataset_dir = Path(self.dataset_path)
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        
        for image_path in dataset_dir.iterdir():
            if image_path.suffix.lower() in image_extensions:
                # Extract name from filename (format: name_number.extension)
                name = image_path.stem.rsplit('_', 1)[0]
                
                print(f"Loading {image_path.name} for {name}")
                
                # Load image
                image = cv2.imread(str(image_path))
                if image is None:
                    print(f"✗ Could not load {image_path.name}")
                    continue
                
                # Convert to grayscale
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                
                # Detect faces
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)
                
                if len(faces) > 0:
                    # Use the first (largest) face found
                    (x, y, w, h) = faces[0]
                    face = gray[y:y+h, x:x+w]
                    
                    # Resize to standard size for comparison
                    face = cv2.resize(face, (100, 100))
                    
                    self.known_faces.append(face)
                    self.known_names.append(name)
                    print(f"✓ Added face for {name}")
                else:
                    print(f"✗ No face found in {image_path.name}")
        
        print(f"Total faces loaded: {len(self.known_faces)}")
        return len(self.known_faces) > 0
    
    def compare_faces(self, face1, face2):
        """Compare two face images using template matching"""
        # Ensure both faces are the same size
        face1 = cv2.resize(face1, (100, 100))
        face2 = cv2.resize(face2, (100, 100))
        
        # Use template matching
        result = cv2.matchTemplate(face1, face2, cv2.TM_CCOEFF_NORMED)
        return result[0][0]
    
    def recognize_face(self, face_image):
        """Recognize a face by comparing with known faces"""
        if len(self.known_faces) == 0:
            return "Unknown", 0
        
        best_match_score = -1
        best_match_name = "Unknown"
        
        # Resize face for comparison
        face_resized = cv2.resize(face_image, (100, 100))
        
        # Compare with all known faces
        for i, known_face in enumerate(self.known_faces):
            score = self.compare_faces(face_resized, known_face)
            
            if score > best_match_score:
                best_match_score = score
                best_match_name = self.known_names[i]
        
        # Set threshold for recognition
        confidence = best_match_score * 100
        if best_match_score < 0.6:  # Threshold
            best_match_name = "Unknown"
            confidence = 0
        
        return best_match_name, confidence
    
    def recognize_faces_in_image(self, image_path):
        """Recognize faces in a single image"""
        if len(self.known_faces) == 0:
            print("❌ No faces loaded in dataset!")
            return None
        
        # Load the image
        image = cv2.imread(image_path)
        if image is None:
            print(f"Could not load image: {image_path}")
            return None
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)
        
        print(f"Found {len(faces)} face(s) in the image")
        
        for (x, y, w, h) in faces:
            # Extract face
            face = gray[y:y+h, x:x+w]
            
            # Recognize face
            name, confidence = self.recognize_face(face)
            
            print(f"Detected: {name} (confidence: {confidence:.1f}%)")
            
            # Draw rectangle and label
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(image, (x, y), (x+w, y+h), color, 2)
            cv2.rectangle(image, (x, y+h-35), (x+w, y+h), color, cv2.FILLED)
            
            label = f"{name} ({confidence:.1f}%)" if confidence > 0 else name
            cv2.putText(image, label, (x+6, y+h-6), cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
        
        return image
    
    def real_time_recognition(self, camera_index=1):
        """Real-time face recognition using webcam"""
        if len(self.known_faces) == 0:
            print("❌ No faces loaded in dataset!")
            return

        print("Starting real-time face recognition...")
        print("Press 'q' to quit")

        # Try to open the specified camera first, then fallback
        video_capture = cv2.VideoCapture(camera_index)
        if not video_capture.isOpened():
            print(f"Camera {camera_index} not available, trying camera 0...")
            video_capture = cv2.VideoCapture(0)
            if not video_capture.isOpened():
                print("Error: Could not open any webcam")
                return

        print(f"Using camera {camera_index}")

        # Variables for detection
        frame_count = 0
        process_every = 2  # Process every 2nd frame for responsiveness
        last_detection_time = 0
        detection_cooldown = 0.5  # 0.5 second cooldown for print messages
        current_detections = {}  # Current frame detections
        last_stable_detections = {}  # Keep last known good detections
        
        import time

        while True:
            ret, frame = video_capture.read()
            if not ret:
                print("Failed to capture frame")
                break

            frame_count += 1
            current_time = time.time()

            # Process every nth frame for face detection
            if frame_count % process_every == 0:
                # Convert to grayscale for face detection
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

                # Detect faces with better parameters for accuracy
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=3,  # Reduced for better detection
                    minSize=(30, 30),  # Minimum face size
                    maxSize=(300, 300)  # Maximum face size
                )

                # Always show detection boxes for ALL detected faces
                for (x, y, w, h) in faces:
                    # Extract face
                    face = gray[y:y+h, x:x+w]

                    # Recognize face
                    name, confidence = self.recognize_face(face)

                    # Choose color and thickness based on confidence
                    if name != "Unknown" and confidence > 70:
                        color = (0, 255, 0)  # Green for high confidence
                        thickness = 3
                    elif name != "Unknown" and confidence > 50:
                        color = (0, 255, 255)  # Yellow for medium confidence
                        thickness = 2
                    else:
                        color = (0, 0, 255)  # Red for unknown/low confidence
                        thickness = 2

                    # ALWAYS draw rectangle around face (this stays visible)
                    cv2.rectangle(frame, (x, y), (x+w, y+h), color, thickness)

                    # ALWAYS draw label background
                    cv2.rectangle(frame, (x, y+h-35), (x+w, y+h), color, cv2.FILLED)

                    # ALWAYS draw label text
                    label = f"{name}"
                    if confidence > 0:
                        label += f" ({confidence:.1f}%)"

                    cv2.putText(frame, label, (x+6, y+h-6),
                               cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)

                    # Print detection with cooldown (only for recognized faces)
                    if (name != "Unknown" and confidence > 60 and
                        current_time - last_detection_time > detection_cooldown):
                        print(f"🎯 Detected: {name} ({confidence:.1f}%)")
                        last_detection_time = current_time
            
            # Add status information on the frame
            status_text = f"Faces Detected: {len(faces) if 'faces' in locals() else 0}"
            cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # Add instructions
            instruction_text = "Press 'q' to quit"
            cv2.putText(frame, instruction_text, (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            # Display frame
            cv2.imshow('Face Recognition - LIVE', frame)
            
            # Break on 'q' key press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        # Cleanup
        video_capture.release()
        cv2.destroyAllWindows()
        print("Face recognition stopped.")

def test_system():
    """Test the face recognition system"""
    print("=== Testing Simple Face Recognition System ===")
    
    fr_system = SimpleFaceRecognition()
    
    # Test loading dataset
    if fr_system.load_dataset():
        print("✅ Dataset loaded successfully")
        
        # Show loaded names
        unique_names = list(set(fr_system.known_names))
        print(f"✅ Loaded faces for: {', '.join(unique_names)}")
        
        return True
    else:
        print("❌ Failed to load dataset")
        return False

def main():
    print("=== Simple Face Recognition System ===")
    
    # Initialize and load dataset
    fr_system = SimpleFaceRecognition()
    
    if not fr_system.load_dataset():
        print("❌ Failed to load dataset! Please check your dataset folder.")
        return
    
    # Show loaded names
    unique_names = list(set(fr_system.known_names))
    print(f"\nLoaded faces for: {', '.join(unique_names)}")
    
    while True:
        print("\nChoose an option:")
        print("1. Real-time recognition (webcam)")
        print("2. Recognize faces in an image")
        print("3. Test system")
        print("4. Exit")
        
        choice = input("Enter choice (1-4): ").strip()
        
        if choice == '1':
            fr_system.real_time_recognition(camera_index=1)
        elif choice == '2':
            image_path = input("Enter image path: ").strip()
            if os.path.exists(image_path):
                result_image = fr_system.recognize_faces_in_image(image_path)
                if result_image is not None:
                    cv2.imshow('Face Recognition Result', result_image)
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
            else:
                print("Image not found!")
        elif choice == '3':
            test_system()
        elif choice == '4':
            print("Goodbye!")
            break
        else:
            print("Invalid choice!")

if __name__ == "__main__":
    main()
