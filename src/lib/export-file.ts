/**
 * Cross-platform file export. On web it downloads via a Blob + <a download>
 * anchor; on iOS (WKWebView, where anchor downloads silently do nothing) it
 * writes the file to the Cache directory and opens the native share sheet.
 *
 * I/O only — no pure logic to unit-test. Follows the style of notifications.ts:
 * dynamic `await import('@capacitor/...')`, early platform branch.
 */

/** Web path: Blob + anchor + revoke. Moved verbatim from useCycles.ts. */
function downloadViaAnchor(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Write `content` to a file named `filename` and hand it to the user. On the
 * native iOS app this writes to Directory.Cache and opens the share sheet; on
 * web it triggers a browser download.
 */
export async function exportFile(filename: string, content: string, mimeType: string): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) {
    downloadViaAnchor(filename, content, mimeType);
    return;
  }

  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  try {
    // v8 Share typings expose `files?: string[]` for sharing a written file;
    // `url` is for sharing a link. We want the file, so pass its file:// uri
    // in `files`. Wrap so cancelling the share sheet doesn't reject unhandled
    // (same catch-and-ignore pattern as navigator.share in SettingsView).
    await Share.share({ files: [uri] });
  } catch {
    /* user cancelled the share sheet — ignore */
  }
}
