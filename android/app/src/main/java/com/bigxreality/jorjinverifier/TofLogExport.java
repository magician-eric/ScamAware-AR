package com.bigxreality.jorjinverifier;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * The staff management mode's 匯出紀錄檔: the frame log ({@link TofFrameFile}) gathered into one
 * text file that LINE, e-mail or a cloud drive can take from the share sheet - no USB cable, no
 * {@code adb pull}.
 *
 * <p>One file rather than two: {@code tof-frames.1.txt} (older) then {@code tof-frames.txt}
 * (newer), under a header saying which phone, which versions and which settings, so whoever reads
 * it has the whole session in order. The copy is made into {@link #DIRECTORY} under the app's
 * cache, which {@link TofLogProvider} serves and nothing else does; the copy before it is deleted
 * first, so at most one export ever takes up space.
 */
final class TofLogExport {
    static final String DIRECTORY = "tof-export";
    static final String PREFIX = "cibar-tof-";
    static final String SUFFIX = ".txt";

    private TofLogExport() { }

    /** {@code cibar-tof-1.2.4-20261016-153000.txt}. */
    static String fileName(String shellVersion, long wallClockMs) {
        String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.ROOT).format(new Date(wallClockMs));
        String version = shellVersion == null ? "" : shellVersion.replaceAll("[^0-9A-Za-z.]", "");
        return PREFIX + (version.isEmpty() ? "" : version + "-") + stamp + SUFFIX;
    }

    /**
     * Writes {@code header}, then {@code older}, then {@code newer} (either may be missing) into
     * {@code exportDir/name}, after deleting every earlier export there.
     *
     * @return the file written, or null when there was no log to export or it could not be
     *         written.
     */
    static File write(File exportDir, String name, String header, File older, File newer) {
        boolean hasOlder = older != null && older.isFile() && older.length() > 0;
        boolean hasNewer = newer != null && newer.isFile() && newer.length() > 0;
        if (!hasOlder && !hasNewer) return null;
        if (!exportDir.isDirectory() && !exportDir.mkdirs()) return null;
        File[] earlier = exportDir.listFiles();
        if (earlier != null) {
            for (File file : earlier) {
                if (file.getName().startsWith(PREFIX)) file.delete();
            }
        }
        File out = new File(exportDir, name);
        try (OutputStream stream = new FileOutputStream(out)) {
            if (header != null) stream.write(header.getBytes(StandardCharsets.UTF_8));
            byte[] buffer = new byte[64 * 1024];
            if (hasOlder) copy(older, stream, buffer);
            if (hasNewer) copy(newer, stream, buffer);
        } catch (IOException e) {
            out.delete();
            return null;
        }
        return out;
    }

    private static void copy(File from, OutputStream to, byte[] buffer) throws IOException {
        try (InputStream in = new FileInputStream(from)) {
            int n;
            while ((n = in.read(buffer)) > 0) to.write(buffer, 0, n);
        }
    }

    /** Whether {@code name} is something {@link #write} could have produced: no path, no tricks. */
    static boolean isExportName(String name) {
        return name != null && name.startsWith(PREFIX) && name.endsWith(SUFFIX)
                && name.length() <= 80 && name.matches("[0-9A-Za-z.\\-]+");
    }
}
