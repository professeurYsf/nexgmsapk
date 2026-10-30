plugins {
  alias(libs.plugins.android.application)
}

// Release is signed only when a keystore + password are provided (env vars / GitHub secrets).
// Otherwise an UNSIGNED apk/aab is produced, to be signed afterwards with an external signing tool.
val releaseKeystoreFile = file(System.getenv("KEYSTORE_PATH") ?: "${rootDir}/my-upload-key.jks")
val canSignRelease = releaseKeystoreFile.exists() && !System.getenv("STORE_PASSWORD").isNullOrEmpty()

android {
  namespace = "com.nexgms.profysf"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.nexgms.profysf"
    minSdk = 24
    targetSdk = 36
    versionCode = 1
    versionName = "1.0.0"
  }

  androidResources {
    noCompress += listOf("ogg")
  }

  // Do not remove or modify these signingConfigs. They are necessary for building, installing,
  // and updating Android apps in AI Studio.
  signingConfigs {
    create("release") {
      storeFile = releaseKeystoreFile
      storePassword = System.getenv("STORE_PASSWORD")
      keyAlias = System.getenv("KEY_ALIAS") ?: "nexgms"
      keyPassword = System.getenv("KEY_PASSWORD")
    }
    create("debugConfig") {
      storeFile = file("${rootDir}/debug.keystore")
      storePassword = "android"
      keyAlias = "androiddebugkey"
      keyPassword = "android"
    }
  }

  buildTypes {
    release {
      isCrunchPngs = false
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      // Do not remove or modify this signingConfig assignment. It is necessary for Android apps in
      // AI Studio.
      signingConfig = if (canSignRelease) signingConfigs.getByName("release") else null
    }
    debug {
      // Do not remove or modify this signingConfig assignment. It is necessary for Android apps in
      // AI Studio.
      signingConfig = signingConfigs.getByName("debugConfig")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
  }
  buildFeatures {
    buildConfig = true
  }
  dependenciesInfo {
    includeInApk = false
    includeInBundle = true
  }
}

dependencies {
  // Google Mobile Ads (AdMob) + User Messaging Platform (consent form)
  implementation("com.google.android.gms:play-services-ads:23.6.0")
  implementation("com.google.android.ump:user-messaging-platform:3.1.0")
}
