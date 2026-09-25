import Foundation

enum ICOEncoder {
  static func encodePNGChunks(_ chunks: [(size: Int, data: Data)]) throws -> Data {
    guard !chunks.isEmpty else { throw RoundedIconError.encodingFailed("ICO") }
    var output = Data()
    append(UInt16(0), to: &output)
    append(UInt16(1), to: &output)
    append(UInt16(chunks.count), to: &output)

    var offset = UInt32(6 + 16 * chunks.count)
    for chunk in chunks {
      output.append(chunk.size >= 256 ? 0 : UInt8(chunk.size))
      output.append(chunk.size >= 256 ? 0 : UInt8(chunk.size))
      output.append(0)
      output.append(0)
      append(UInt16(1), to: &output)
      append(UInt16(32), to: &output)
      append(UInt32(chunk.data.count), to: &output)
      append(offset, to: &output)
      offset += UInt32(chunk.data.count)
    }
    for chunk in chunks { output.append(chunk.data) }
    return output
  }

  private static func append<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
    var littleEndian = value.littleEndian
    withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
  }
}
