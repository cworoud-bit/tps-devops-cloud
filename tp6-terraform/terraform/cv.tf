terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

variable "cv_port" {
  type    = number
  default = 8001
}

provider "docker" {}

resource "docker_image" "cv" {
  name         = "root04602/cv-onepage:latest"
  keep_locally = true
}

resource "docker_container" "cv" {
  image = docker_image.cv.image_id
  name  = "cv-onepage"
  ports {
    internal = 80
    external = var.cv_port
  }
  restart = "unless-stopped"
}
