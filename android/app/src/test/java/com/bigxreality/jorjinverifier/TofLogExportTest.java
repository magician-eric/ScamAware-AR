package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import org.junit.Test;

/** 匯出紀錄檔: the frame log as one file for the share sheet. */
public class TofLogExportTest {
    private static File write(File file, String text) throws Exception {
        Files.write(file.toPath(), text.getBytes(StandardCharsets.UTF_8));
        return file;
    }

    private static String read(File file) throws Exception {
        return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
    }

    @Test public void theOlderFileComesFirstUnderAHeader() throws Exception {
        File logs = Files.createTempDirectory("logs").toFile();
        File older = write(new File(logs, TofFrameFile.PREVIOUS_NAME), "F 1\n");
        File newer = write(new File(logs, TofFrameFile.NAME), "F 2\n");
        File exportDir = new File(Files.createTempDirectory("cache").toFile(), TofLogExport.DIRECTORY);

        File out = TofLogExport.write(exportDir, "cibar-tof-1.2.4-20261016-120000.txt",
                "# 標頭\n", older, newer);
        assertEquals("# 標頭\nF 1\nF 2\n", read(out));
        assertEquals(exportDir, out.getParentFile());
    }

    @Test public void onlyTheNewestExportIsKept() throws Exception {
        File logs = Files.createTempDirectory("logs").toFile();
        File newer = write(new File(logs, TofFrameFile.NAME), "F 2\n");
        File exportDir = Files.createTempDirectory("export").toFile();
        File first = TofLogExport.write(exportDir, "cibar-tof-a.txt", null, null, newer);
        File second = TofLogExport.write(exportDir, "cibar-tof-b.txt", null, null, newer);
        assertFalse("上一次匯出的檔案要刪掉", first.exists());
        assertTrue(second.exists());
        assertEquals("F 2\n", read(second));
    }

    @Test public void nothingToExportIsNull() throws Exception {
        File logs = Files.createTempDirectory("logs").toFile();
        File exportDir = Files.createTempDirectory("export").toFile();
        assertNull(TofLogExport.write(exportDir, "cibar-tof-a.txt", "# x\n",
                new File(logs, TofFrameFile.PREVIOUS_NAME), new File(logs, TofFrameFile.NAME)));
        assertNull(TofLogExport.write(exportDir, "cibar-tof-a.txt", "# x\n",
                write(new File(logs, TofFrameFile.NAME), ""), null));
    }

    @Test public void theNameSaysWhichShellAndWhen() {
        String name = TofLogExport.fileName("1.2.4", 0L);
        assertTrue(name, name.matches("cibar-tof-1\\.2\\.4-\\d{8}-\\d{6}\\.txt"));
        assertTrue(TofLogExport.isExportName(name));
        assertTrue(TofLogExport.fileName("", 0L).matches("cibar-tof-\\d{8}-\\d{6}\\.txt"));
    }

    /** What the provider is willing to open: an export's name and nothing else. */
    @Test public void onlyAnExportsNameIsServed() {
        assertFalse(TofLogExport.isExportName(null));
        assertFalse(TofLogExport.isExportName("tof-frames.txt"));
        assertFalse(TofLogExport.isExportName("cibar-tof-/../../crash.txt"));
        assertFalse(TofLogExport.isExportName("cibar-tof-a/b.txt"));
        assertFalse(TofLogExport.isExportName("cibar-tof-a.txt.png"));
    }

    @Test public void theRecorderFileCanBeFlushedFromAnyThread() throws Exception {
        File dir = Files.createTempDirectory("tof").toFile();
        TofFrameFile sink = new TofFrameFile(dir);
        sink.write("one\n");
        sink.flush();
        assertEquals(new File(dir, TofFrameFile.PREVIOUS_NAME), sink.previousFile());
        assertEquals("one\n", read(sink.file()));
    }
}
