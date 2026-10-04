pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker image') {
            steps {
                script {
                    def image = "hydrotrack:${env.BUILD_NUMBER}"
                    if (isUnix()) {
                        sh "docker build -t ${image} ."
                    } else {
                        bat "docker build -t ${image} ."
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'hydrotrack-kubeconfig', variable: 'KUBECONFIG')]) {
                    script {
                        def image = "hydrotrack:${env.BUILD_NUMBER}"
                        if (isUnix()) {
                            sh "docker save ${image} | docker exec -i desktop-control-plane ctr -n k8s.io images import -"
                            sh 'kubectl config use-context docker-desktop'
                            sh 'kubectl apply -f kubernetes/'
                            sh "kubectl set image deployment/hydrotrack hydrotrack=${image}"
                            sh 'kubectl rollout status deployment/hydrotrack --timeout=120s'
                        } else {
                            bat "docker save ${image} | docker exec -i desktop-control-plane ctr -n k8s.io images import -"
                            bat 'kubectl config use-context docker-desktop'
                            bat 'kubectl apply -f kubernetes/'
                            bat "kubectl set image deployment/hydrotrack hydrotrack=${image}"
                            bat 'kubectl rollout status deployment/hydrotrack --timeout=120s'
                        }
                    }
                }
            }
        }
    }
}