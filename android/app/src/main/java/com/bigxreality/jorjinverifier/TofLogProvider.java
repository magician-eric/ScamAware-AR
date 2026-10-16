package com.bigxreality.jorjinverifier;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Hands the exported frame log ({@link TofLogExport}) to the app the staff member picks in the
 * share sheet - LINE, Gmail, Drive.
 *
 * <p>A file can only cross to another app as a {@code content://} URI with a read grant; a
 * {@code file://} path is refused since Android 7. AndroidX's FileProvider does exactly this, but
 * the app does not otherwise depend on androidx.core, and what is needed is small: serve the one
 * exported file, read-only, by name, from the one cache directory {@link TofLogExport} writes.
 * Not exported - another app reaches it only through the per-URI grant the share intent carries -
 * and every name is checked by {@link TofLogExport#isExportName} before a file is opened, so no
 * path can lead anywhere else.
 */
public final class TofLogProvider extends ContentProvider {
    static final String AUTHORITY_SUFFIX = ".toflog";
    static final String MIME = "text/plain";

    static String authority(String packageName) {
        return packageName + AUTHORITY_SUFFIX;
    }

    static Uri uriFor(String packageName, File exported) {
        return new Uri.Builder().scheme("content").authority(authority(packageName))
                .appendPath(exported.getName()).build();
    }

    @Override public boolean onCreate() {
        return true;
    }

    private File fileFor(Uri uri) {
        if (uri == null || getContext() == null) return null;
        String name = uri.getLastPathSegment();
        if (!TofLogExport.isExportName(name) || uri.getPathSegments().size() != 1) return null;
        File file = new File(new File(getContext().getCacheDir(), TofLogExport.DIRECTORY), name);
        return file.isFile() ? file : null;
    }

    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (mode != null && !"r".equals(mode)) throw new FileNotFoundException("read-only");
        File file = fileFor(uri);
        if (file == null) throw new FileNotFoundException(String.valueOf(uri));
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    /** The name and size the receiving app shows; LINE and Gmail both ask. */
    @Override public Cursor query(Uri uri, String[] projection, String selection,
                                  String[] selectionArgs, String sortOrder) {
        File file = fileFor(uri);
        String[] columns = projection == null
                ? new String[] {OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
        MatrixCursor cursor = new MatrixCursor(columns, 1);
        if (file == null) return cursor;
        Object[] row = new Object[columns.length];
        for (int i = 0; i < columns.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(columns[i])) row[i] = file.getName();
            else if (OpenableColumns.SIZE.equals(columns[i])) row[i] = file.length();
        }
        cursor.addRow(row);
        return cursor;
    }

    @Override public String getType(Uri uri) {
        return MIME;
    }

    @Override public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("read-only");
    }

    @Override public int delete(Uri uri, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("read-only");
    }

    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("read-only");
    }
}
