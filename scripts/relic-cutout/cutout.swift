import Foundation
import Vision
import CoreImage
import AppKit

// Subject cut-out with Apple's Vision foreground-instance mask. Writes an RGBA PNG.
let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: cutout in out"); exit(64) }
let handler = VNImageRequestHandler(url: URL(fileURLWithPath: args[1]), options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([request]) } catch { print("vision failed: \(error)"); exit(1) }
guard let obs = request.results?.first else { print("no foreground found"); exit(2) }
print("instances: \(obs.allInstances.count)")
do {
  let buffer = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
  let ci = CIImage(cvPixelBuffer: buffer)
  let ctx = CIContext()
  try ctx.writePNGRepresentation(of: ci, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  print("wrote \(args[2])")
} catch { print("mask failed: \(error)"); exit(3) }
