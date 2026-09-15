#!/usr/bin/env node
/**
 * A tiny, dependency-free, deterministic ZIP writer for the OTA web bundle.
 *
 * WHY NOT SHELL OUT TO `zip`
 * The bundle's SHA-256 is the phone's only proof that it downloaded what we published, and it is
 * computed once by the publisher and checked once on the device. `zip(1)` stamps each entry with
 * the file's mtime, which on a CI runner is the checkout time - so re-running the same workflow
 * on the same commit produces a different archive, a different digest, and a "new" 80 MB download
 * for bytes the phone already has. Every field here that could carry a clock is fixed instead.
 *
 * WHY NOT A LIBRARY
 * webapp/ ships to a phone; nothing in package.json exists only to run a build step. Node has
 * `zlib.deflateRawSync` and `zlib.crc32`, which is the whole of what a ZIP needs.
 *
 * WHAT THE PHONE READS IT WITH
 * `java.util.zip.ZipInputStream` (BundleInstaller.java), which streams entries in file order and
 * never looks at the central directory. That is why every local header here carries the real
 * compressed size, uncompressed size and CRC-32 up front rather than a trailing data descriptor:
 * a streaming reader cannot rewind to find one, and for a STORED entry it would not know where
 * the data ends.
 */
import { createHash } from 'node:crypto'
import { deflateRawSync, crc32 } from 'node:zlib'

/** DOS timestamp for 1980-01-01 00:00:00 - the epoch of the format, and the same in every run. */
const DOS_EPOCH_TIME = 0
const DOS_EPOCH_DATE = (1 << 5) | 1 // year 1980, month 1, day 1

const METHOD_STORE = 0
const METHOD_DEFLATE = 8

/**
 * Extensions whose bytes are already compressed. Deflating them again costs CPU on every publish
 * and yields nothing - and on the phone, an entry stored uncompressed is written out at memcpy
 * speed. The scenario videos are most of the bundle, so this is most of the extraction time.
 */
const ALREADY_COMPRESSED = new Set([
  '.mp4', '.webm', '.m4a', '.mp3', '.ogg', '.wav',
  '.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif',
  '.woff', '.woff2', '.zip', '.gz', '.mind',
])

function extensionOf(path) {
  const dot = path.lastIndexOf('.')
  const slash = path.lastIndexOf('/')
  return dot > slash ? path.slice(dot).toLowerCase() : ''
}

/**
 * Builds the archive in memory.
 *
 * @param {{path: string, data: Buffer}[]} entries files to store; order is normalised so the same
 *        set of files always produces the same bytes.
 * @returns {{buffer: Buffer, sha256: string, entries: number}}
 */
export function writeZip(entries) {
  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const seen = new Set()
  const locals = []
  const centrals = []
  let offset = 0

  for (const entry of sorted) {
    if (seen.has(entry.path)) throw new Error(`ota-zip: duplicate entry ${entry.path}`)
    seen.add(entry.path)
    const name = Buffer.from(entry.path, 'utf8')
    if (entry.path.startsWith('/') || entry.path.includes('..')) {
      throw new Error(`ota-zip: refusing an entry that could escape the bundle: ${entry.path}`)
    }
    const raw = entry.data
    const store = ALREADY_COMPRESSED.has(extensionOf(entry.path))
    const deflated = store ? null : deflateRawSync(raw, { level: 9 })
    const useDeflate = deflated !== null && deflated.length < raw.length
    const body = useDeflate ? deflated : raw
    const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE
    const crc = crc32(raw) >>> 0

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)              // version needed: 2.0 (deflate)
    local.writeUInt16LE(0x0800, 6)          // general purpose: UTF-8 names, no data descriptor
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(DOS_EPOCH_TIME, 10)
    local.writeUInt16LE(DOS_EPOCH_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, name, body)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)            // version made by
    central.writeUInt16LE(20, 6)            // version needed
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(DOS_EPOCH_TIME, 12)
    central.writeUInt16LE(DOS_EPOCH_DATE, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)            // extra
    central.writeUInt16LE(0, 32)            // comment
    central.writeUInt16LE(0, 34)            // disk number
    central.writeUInt16LE(0, 36)            // internal attributes
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38) // external attributes: regular file, rw-r--r--
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += local.length + name.length + body.length
  }

  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(sorted.length, 8)
  end.writeUInt16LE(sorted.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  const buffer = Buffer.concat([...locals, directory, end])
  return {
    buffer,
    entries: sorted.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  }
}
