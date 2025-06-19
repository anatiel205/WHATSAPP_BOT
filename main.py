from flask import Flask, render_template, request, jsonify
from threading import Thread
import time

app = Flask(__name__)

@app.route('/')
def home():
    return "Bot do WhatsApp está rodando!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
