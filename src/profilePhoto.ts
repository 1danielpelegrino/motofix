const MAX_SOURCE_SIZE = 10 * 1024 * 1024
const MAX_DIMENSION = 512

export function readProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Choose an image file for your profile photo."))
  }
  if (file.size > MAX_SOURCE_SIZE) {
    return Promise.reject(new Error("Choose an image smaller than 10 MB."))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Unable to read that image."))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("That image could not be opened."))
      image.onload = () => {
        try {
          const scale = Math.min(
            1,
            MAX_DIMENSION / image.width,
            MAX_DIMENSION / image.height,
          )
          const canvas = document.createElement("canvas")
          canvas.width = Math.max(1, Math.round(image.width * scale))
          canvas.height = Math.max(1, Math.round(image.height * scale))
          const context = canvas.getContext("2d")
          if (!context) {
            reject(new Error("Your browser could not process that image."))
            return
          }
          context.fillStyle = "#ffffff"
          context.fillRect(0, 0, canvas.width, canvas.height)
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL("image/jpeg", 0.78))
        } catch {
          reject(new Error("Unable to process that image."))
        }
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
