resource "digitalocean_droplet" "commentaryjs_main" {
  image  = "ubuntu-22-04-x64"
  name   = "commentaryjs"
  region = "sfo2"
  size   = "s-1vcpu-1gb"  # ref: https://slugs.do-api.dev/
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

  # NOTE:
  # DigitalOcean costs $ to create a Docker image
  # since we will host on a single machine - we can create the
  # environment directly with TF
  provisioner "remote-exec" {
    inline = [
      "export PATH=$PATH:/usr/bin",
      "sudo apt-get remove needrestart",

      # install nginx
      "sudo apt update",
      "sudo apt install -y nginx",

      # python
      "sudo apt install -y python3 pip",

      # npm
      "sudo apt install -y software-properties-common npm",
      "npm install npm@latest",
      "npm install n -g",
      "n latest",

      # TODO: setup repo
    ]
  }
}
