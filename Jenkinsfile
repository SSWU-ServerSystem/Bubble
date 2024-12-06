pipeline {
   agent any
   environment {
      // 클러스터 설정 > 연결 > 명령어 참고
      PROJECT_ID = 'open'
      CLUSTER_NAME = 'jenkins'
      LOCATION = 'asia-northeast3-a'
      CREDENTIALS_ID = 'Jenkins Credential GKE ID'
      REGISTRY = "20210989/test"
   }
   stages {
      stage("Checkout code") {
         steps {
            checkout scm
         }
      }
      stage('Clone repository') {
         steps {
            git 'https://github.com/jiyuuuun/3team.git'
         }
      }

      stage('Build image') {
         steps {
            script {   
               myapp = docker.build("${REGISTRY}:${env.BUILD_ID}")
            }
         }
      }
      stage('Test image') {
         steps {
            script {
               myapp.inside {
                  sh 'npm install'
                  sh 'npm test'
               }
            }
         }
      }
      stage("Push image") {
         steps {
            script {
               docker.withRegistry('https://registry.hub.docker.com', 'dockerhubID') {
                  myapp.push("latest")
                  myapp.push("${env.BUILD_ID}")
               }
            }
         }
      }
      stage('Deploy to GKE') {
         when {
            branch 'master'
         }
         steps {
            sh "sed -i 's|이미지명:latest|${REGISTRY}:${env.BUILD_ID}|g' deployment.yaml"
            step([$class: 'KubernetesEngineBuilder', projectId: env.PROJECT_ID, clusterName: env.CLUSTER_NAME, location: env.LOCATION, manifestPattern: 'deployment.yaml', credentialsId: env.CREDENTIALS_ID, verifyDeployments: true])
         }
      }
   }
}
