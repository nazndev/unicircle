// UniCircle — Jenkins pipeline (backend + mobile EAS Android)
// Create Jenkins credentials with the IDs below (see docs/JENKINS_SETUP.md). Do not commit secrets.

pipeline {
  agent any

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  // Secret Text credentials in Jenkins (IDs must exist, or change IDs here and in docs)
  environment {
    DATABASE_URL               = credentials('unicircle-database-url')
    JWT_SECRET                 = credentials('unicircle-jwt-secret')
    CORS_ORIGIN                = credentials('unicircle-cors-origin')
    EXPO_TOKEN                 = credentials('unicircle-expo-token')
    EXPO_PUBLIC_API_BASE_URL   = credentials('unicircle-expo-public-api-base-url')
    EXPO_PUBLIC_MOBILE_API_KEY = credentials('unicircle-expo-public-mobile-api-key')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend: install') {
      steps {
        dir('backend') {
          sh '''
            set -e
            node --version
            npm --version
            npm ci
          '''
        }
      }
    }

    stage('Backend: Prisma generate') {
      steps {
        dir('backend') {
          sh 'npm run prisma:generate'
        }
      }
    }

    stage('Backend: Prisma validate') {
      steps {
        dir('backend') {
          sh 'npx prisma validate'
        }
      }
    }

    stage('Backend: build') {
      steps {
        dir('backend') {
          sh 'npm run build'
        }
      }
    }

    stage('Backend: test') {
      steps {
        dir('backend') {
          sh 'npm run test -- --passWithNoTests'
        }
      }
    }

    stage('Mobile: install') {
      steps {
        dir('mobile') {
          sh '''
            set -e
            npm ci --legacy-peer-deps
          '''
        }
      }
    }

    stage('Mobile: preflight') {
      steps {
        dir('mobile') {
          sh '''
            set -e
            npx expo --version
            npx eas-cli --version
            npx tsc --noEmit
            if ! npx expo-doctor; then
              echo "expo-doctor reported project warnings; continuing so EAS Android test builds can still run."
            fi
          '''
        }
      }
    }

    stage('Mobile: EAS Android (production)') {
      steps {
        dir('mobile') {
          sh '''
            set -e
            mkdir -p "${WORKSPACE}/artifacts"
            export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL}"
            export EXPO_PUBLIC_MOBILE_API_KEY="${EXPO_PUBLIC_MOBILE_API_KEY}"
            # EXPO_TOKEN: headless Expo / EAS (from Jenkins credentials)
            # Do not echo token; Jenkins masks credential-backed env vars in logs when configured.
            set -o pipefail
            npx eas-cli build --platform android --profile production --non-interactive 2>&1 | tee "${WORKSPACE}/artifacts/eas-android-build.log"
            echo "EAS cloud build finished. Full log: artifacts/eas-android-build.log — binary is on Expo (not archived locally unless using local builds)."
            date -u > "${WORKSPACE}/artifacts/build-timestamp.txt" || true
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'artifacts/**/*', allowEmptyArchive: true
    }
    failure {
      echo 'Pipeline failed — review stage logs. Credential values are masked in console output when using the Credentials Binding plugin.'
    }
  }
}
