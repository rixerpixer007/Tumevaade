package io.github.rixerpixer007.stuudium

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AppUpdateClientTest {
    @Test
    fun acceptsThisProjectsGitLabReleaseUrls() {
        val base = "https://gitlab.com/rixerpixer007/tumevaade/-/releases"

        assertTrue(AppUpdateClient.isTrustedReleaseUrl(base))
        assertTrue(AppUpdateClient.isTrustedReleaseUrl("$base/android-v0.1.4"))
    }

    @Test
    fun acceptsAValidUpdateCandidate() {
        val candidate = validCandidate(versionCode = 2L)

        assertEquals(2L, candidate?.versionCode)
        assertEquals("0.1.1-beta", candidate?.versionName)
        assertTrue(AppUpdateClient.isNewer(requireNotNull(candidate), installedVersionCode = 1L))
    }

    @Test
    fun doesNotOfferTheInstalledOrAnOlderVersion() {
        val installed = requireNotNull(validCandidate(versionCode = 2L))

        assertFalse(AppUpdateClient.isNewer(installed, installedVersionCode = 2L))
        assertFalse(AppUpdateClient.isNewer(installed, installedVersionCode = 3L))
    }

    @Test
    fun rejectsUntrustedReleaseUrls() {
        val urls =
            listOf(
                "http://gitlab.com/rixerpixer007/tumevaade/-/releases/android-v1",
                "https://example.com/rixerpixer007/tumevaade/-/releases/android-v1",
                "https://gitlab.com/other/tumevaade/-/releases/android-v1",
                "https://gitlab.com/rixerpixer007/tumevaade/-/issues",
                "https://gitlab.com/rixerpixer007/tumevaade/-/releases/../issues",
                "https://gitlab.com/rixerpixer007/tumevaade/-/releases/%2e%2e/issues",
                "https://gitlab.com@evil.example/rixerpixer007/tumevaade/-/releases",
                "https://gitlab.com/rixerpixer007/tumevaade/-/releases-evil/android-v1",
                "https://gitlab.com:8443/rixerpixer007/tumevaade/-/releases/android-v1",
                "https://gitlab.com/rixerpixer007/tumevaade/-/releases/android-v1?redirect=evil",
                "https://gitlab.com/rixerpixer007/tumevaade/-/releases/android-v1#fragment",
                "https://github.com/rixerpixer007/Tumevaade/releases/tag/android-v0.1.3",
            )

        urls.forEach { url -> assertFalse(url, AppUpdateClient.isTrustedReleaseUrl(url)) }
    }

    @Test
    fun rejectsInvalidManifestValues() {
        assertNull(validCandidate(schemaVersion = 2))
        assertNull(validCandidate(versionCode = 0L))
        assertNull(validCandidate(versionName = ""))
        assertNull(validCandidate(versionName = "bad\nname"))
        assertNull(validCandidate(sha256 = "not-a-checksum"))
    }

    @Test
    fun evaluatesPublishedAndUnpublishedManifestsForManualChecks() {
        val update = requireNotNull(validCandidate(versionCode = 2L))
        val available = AppUpdateClient.evaluateCandidate(1, true, update, 1L)
        val installed = AppUpdateClient.evaluateCandidate(1, true, update, 2L)
        val unpublished =
            AppUpdateClient.evaluateCandidate(1, false, null, 1L)
        val invalid = AppUpdateClient.evaluateCandidate(2, true, update, 1L)

        assertEquals(AppUpdateCheckStatus.UPDATE_AVAILABLE, available.status)
        assertEquals(2L, available.update?.versionCode)
        assertEquals(AppUpdateCheckStatus.UP_TO_DATE, installed.status)
        assertEquals(AppUpdateCheckStatus.UP_TO_DATE, unpublished.status)
        assertEquals(AppUpdateCheckStatus.UNAVAILABLE, invalid.status)
    }

    private fun validCandidate(
        schemaVersion: Int = 1,
        versionCode: Long = 2L,
        versionName: String = "0.1.1-beta",
        releaseUrl: String =
            "https://gitlab.com/rixerpixer007/tumevaade/-/releases/android-v0.1.1-beta",
        sha256: String = "a".repeat(64),
    ): AppUpdate? =
        AppUpdateClient.createCandidate(
            schemaVersion = schemaVersion,
            versionCode = versionCode,
            versionName = versionName,
            releaseUrl = releaseUrl,
            sha256 = sha256,
        )
}
