bind = "0.0.0.0:3333"
# workers = 12 # prod
workers = 1 # local
worker_class = "gevent"
timeout = 9999999
# pidfile = 'pidfile'
# errorlog = 'errorlog'
# loglevel = 'info'
# accesslog = 'accesslog'
# access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'
# certfile = "/etc/letsencrypt/live/visualize.ego4d-data.org/fullchain.pem"
# keyfile = "/etc/letsencrypt/live/visualize.ego4d-data.org/privkey.pem"


# Load Env Variables
import os
# from dotenv import load_dotenv

# for env_file in ('.env', '.flaskenv'):
#     env = os.path.join(os.getcwd(), env_file)
#     if os.path.exists(env):
#         load_dotenv(env)
