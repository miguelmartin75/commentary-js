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
      "sudo snap install core; sudo snap refresh core",
      "sudo snap install --classic certbot",
    ]
  }

  provisioner "file" {
    source      = "nginx.conf"
    destination = "/etc/nginx/sites-enabled/commentaryjs"
  }

  # TODO: https://blog.cloudflare.com/getting-started-with-terraform-and-cloudflare-part-1/
  provisioner "file" {
    source      = "certs.sh"
    destination = "/root/certs.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo ufw allow 'Nginx Full'",
      "sudo ufw delete allow 'Nginx HTTP'",
      "sudo systemctl restart nginx",
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
