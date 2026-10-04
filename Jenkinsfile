pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        IMAGE_NAME = "hydrotrack"
        IMAGE_TAG  = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker image') {
            steps {
                bat 'docker build -t %IMAGE_NAME%:%IMAGE_TAG% .'
            }
        }

        stage('Verify Docker image') {
            steps {
                bat 'docker images hydrotrack'
            }
        }

        stage('Verify Kubernetes access') {
            steps {
                bat 'kubectl get nodes'
                bat 'kubectl get deployment hydrotrack'
            }
        }

        stage('Apply Kubernetes manifests') {
            steps {
                bat 'kubectl apply -f kubernetes/deployment.yaml'
                bat 'kubectl apply -f kubernetes/service.yaml'
            }
        }

        stage('Update HydroTrack image') {
            steps {
                bat 'kubectl set image deployment/hydrotrack hydrotrack=hydrotrack:%IMAGE_TAG%'
            }
        }

        stage('Wait for rollout') {
            steps {
                bat 'kubectl rollout status deployment/hydrotrack --timeout=120s'
            }
        }

        stage('Verify deployment') {
            steps {
                bat 'kubectl get pods'
                bat 'kubectl get deployment hydrotrack'
                bat 'kubectl get service hydrotrack-service'
            }
        }
    }
}
