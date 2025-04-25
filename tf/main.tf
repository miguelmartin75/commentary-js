variable "aws_access_key" {}
variable "aws_secret_access_key" {}

resource "digitalocean_droplet" "commentaryjs" {
  image  = "docker-20-04"
  name   = "commentaryjs"
  region = "sfo2"
  size   = "s-1vcpu-1gb" # ref: https://slugs.do-api.dev/
  ssh_keys = [
    data.digitalocean_ssh_key.terraform1.id
  ]

  connection {
    host        = self.ipv4_address
    user        = "root"
    type        = "ssh"
    private_key = file(var.pvt_key)
    timeout     = "2m"
  }

  provisioner "remote-exec" {
    inline = [
      "export PATH=$PATH:/usr/bin",
      "echo 'AWS_ACCESS_KEY=${var.aws_access_key}' >> ~/.env",
      "echo 'AWS_SECRET_ACCESS_KEY=${var.aws_secret_access_key}' >> ~/.env",

      # install nginx
      "sudo apt update",
      "sudo apt install -y nginx",
      "sudo rm /etc/nginx/sites-enabled/default",
    ]
  }

  provisioner "file" {
    source      = "nginx.conf"
    destination = "/etc/nginx/sites-enabled/commentaryjs"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo systemctl restart nginx",
      "sudo ufw allow 'Nginx Full'",
    ]
  }

  user_data = <<-EOF
    #!/bin/bash
    docker run -p 3333:3333 --env-file ~/.env miguelmartin/commentaryjs:latest
  EOF
}


resource "digitalocean_reserved_ip" "static_ip" {
  droplet_id = digitalocean_droplet.commentaryjs.id
  region     = digitalocean_droplet.commentaryjs.region
}
