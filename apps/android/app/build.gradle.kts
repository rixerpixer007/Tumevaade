import java.util.Properties

plugins {
    id("com.android.application")
}

// Read the shared source directly; Android Studio builds need no Node sync step.
val releaseVersions = Properties().apply {
    rootProject.file("../../release/version.properties").inputStream().use { load(it) }
}
val sourceVersionCode = releaseVersions.getProperty("androidVersionCode").toInt()
require(sourceVersionCode in 1..2100000000) { "Invalid androidVersionCode" }
val sourceVersionName = releaseVersions.getProperty("androidVersionName")
require(Regex("(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)").matches(sourceVersionName)) {
    "Invalid androidVersionName"
}

val releaseBuildRequested =
    gradle.startParameter.taskNames.any { taskName ->
        taskName.substringAfterLast(':').contains("Release", ignoreCase = true)
    }

// CI builds unsigned on a runner with no access to the permanent signing key.
val releaseSigningRequested = releaseBuildRequested &&
    !providers.gradleProperty("tumevaadeUnsignedRelease").orElse("false").get().toBooleanStrict()

val releaseKeystorePath = providers.environmentVariable("SINU_STUUDIUM_KEYSTORE_PATH").orNull
val releaseKeystorePassword =
    providers.environmentVariable("SINU_STUUDIUM_KEYSTORE_PASSWORD").orNull
val releaseKeyAlias =
    providers.environmentVariable("SINU_STUUDIUM_KEY_ALIAS").orElse("sinu-stuudium-release").get()
val releaseKeyPassword =
    providers.environmentVariable("SINU_STUUDIUM_KEY_PASSWORD").orNull
        ?: releaseKeystorePassword

if (releaseSigningRequested) {
    val missingVariables =
        buildList {
            if (releaseKeystorePath.isNullOrBlank()) add("SINU_STUUDIUM_KEYSTORE_PATH")
            if (releaseKeystorePassword.isNullOrBlank()) {
                add("SINU_STUUDIUM_KEYSTORE_PASSWORD")
            }
        }

    if (missingVariables.isNotEmpty()) {
        throw GradleException(
            "Release signing is not configured. Set ${missingVariables.joinToString()} in the current shell.",
        )
    }

    if (!file(requireNotNull(releaseKeystorePath)).isFile) {
        throw GradleException("The release keystore file does not exist at the configured path.")
    }
}

android {
    namespace = "io.github.rixerpixer007.stuudium"
    compileSdk = 37

    defaultConfig {
        applicationId = "io.github.rixerpixer007.stuudium"
        minSdk = 26
        targetSdk = 37
        versionCode = sourceVersionCode
        versionName = sourceVersionName
    }

    signingConfigs {
        if (releaseSigningRequested) {
            create("release") {
                storeFile = file(requireNotNull(releaseKeystorePath))
                storePassword = requireNotNull(releaseKeystorePassword)
                keyAlias = releaseKeyAlias
                keyPassword = requireNotNull(releaseKeyPassword)
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
        }

        release {
            if (releaseSigningRequested) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

val verifyMobileWebAssets = tasks.register("verifyMobileWebAssets") {
    val assetManifest = layout.projectDirectory.file("src/main/assets/mobile/asset-manifest.json")
    inputs.file(assetManifest)

    doLast {
        if (!assetManifest.asFile.isFile) {
            throw GradleException(
                "Android WebView assets are missing. Run `npm run build:mobile:web` from the repository root.",
            )
        }
    }
}

tasks.named("preBuild").configure {
    dependsOn(verifyMobileWebAssets)
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.13.0")
    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.2.0")
    implementation("androidx.webkit:webkit:1.17.0")

    testImplementation("junit:junit:4.13.2")
}
