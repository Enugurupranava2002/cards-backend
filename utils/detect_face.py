import cv2
import numpy as np

def face_detector(imgStr):
    nparr = np.frombuffer(imgStr, np.uint8)
    img = cv2.imdecode(nparr, cv2.CV_LOAD_IMAGE_COLOR)
    face_classifier = cv2.CascadeClassifier("./Haarcascades/haarcascade_frontalface_default.xml")
    gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_classifier.detectMultiScale(gray_img, 1.5, 6)

    if(faces.length != 1):
        return
    
    return [faces[0][1],faces[0][0], faces[0][2], faces[0][3]]

