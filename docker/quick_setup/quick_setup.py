import argparse
import os
import logging
import shutil
import random
import string 
import sys
from cryptography.fernet import Fernet
sys.path.append('../../backend')
import lost
logging.basicConfig(level=logging.INFO, format='(%(levelname)s): %(message)s')

DEFAULT_RELEASE = '1.4.2'

def gen_rand_string(n):
    return Fernet.generate_key().decode()
class DockerComposeBuilder(object):

    def get_header(self):
        return (
            "version: '2.3'\n"
            "services:\n"
        )


    def get_lost(self):
        return (
            '    lost:\n'
            '      image: l3pcv/lost' + self.dockerImageSlug + ':${LOST_VERSION}\n'
            '      container_name: lost\n'
            '      command: bash /entrypoint.sh\n'
            '      env_file:\n'
            '        - .env\n'
            '      volumes:\n'
            '        - ${LOST_DATA}:/home/lost\n'
            '      restart: always\n'
            '      ports:\n'
            '        - "${LOST_FRONTEND_PORT}:8080"\n'
            '      environment:\n'
            '        PYTHONPATH: "/code/src/backend"\n'
            '        ENV_NAME: "lost"\n'
            '        WORKER_NAME: "lost-0"\n'
            '        PY3_INIT: "source /opt/conda/bin/activate lost"\n'
            '      links:\n'
            '        - db-lost\n'
        )

    def get_lostdb(self):
        return (
            '    db-lost:\n'
            '      image: mysql:5.7\n'
            '      container_name: db-lost\n'
            '      volumes:\n'
            '          - ${LOST_DATA}/mysql:/var/lib/mysql\n'
            '      restart: always\n'
            '      environment:\n'
            '          MYSQL_DATABASE: ${LOST_DB_NAME}\n'
            '          MYSQL_USER: ${LOST_DB_USER}\n'
            '          MYSQL_PASSWORD: ${LOST_DB_PASSWORD}\n'
            '          MYSQL_ROOT_PASSWORD: ${LOST_DB_ROOT_PASSWORD}\n'
        )

    def get_phpmyadmin(self):
        return (
            '    phpmyadmin:\n'
            '      image: phpmyadmin/phpmyadmin\n'
            '      container_name: phpmyadmin\n'
            '      restart: always\n'
            '      environment:\n'
            '          PMA_ARBITRARY: 1\n'
            '          MYSQL_USER: ${LOST_DB_USER}\n'
            '          MYSQL_PASSWORD: ${LOST_DB_PASSWORD}\n'
            '          MYSQL_ROOT_PASSWORD: ${LOST_DB_ROOT_PASSWORD}\n'
            '      links:\n'
            '          - "db-lost:db"\n'
            '      ports:\n'
            '          - "${PHP_MYADMIN_PORT}:80"\n'
        )

    def _write_file(self, sotre_path, content):
        with open(sotre_path, 'w') as f:
            f.write(content)

    def write_production_file(self, store_path, phpmyadmin):
        content = self.get_header()
        content += self.get_lost()
        content += self.get_lostdb()
        if phpmyadmin:
            content += self.get_phpmyadmin()
        self._write_file(store_path, content)

class QuickSetup(object):
    
    def __init__(self, args):
        self.args = args
        self.secret_key = gen_rand_string(16)
        self.dst_data_dir = os.path.join(args.install_path, 'data')
        self.dst_docker_dir = os.path.join(args.install_path, 'docker')
        if args.release is None:
            self.release = DEFAULT_RELEASE
            # self.release = lost.__version__
        else:
            self.release = args.release
        if args.testing == "True":
            self.dockerImageSlug = '-test'
        else:
            self.dockerImageSlug = ''
    
    def write_docker_compose(self, store_path):
        builder = DockerComposeBuilder()
        builder.dockerImageSlug = self.dockerImageSlug
        builder.write_production_file(store_path, self.args.phpmyadmin)
        logging.info('Wrote docker-compose config to: {}'.format(store_path))
        

    def write_env_config(self, env_path):
        '''Write env file to filesystem
        Args:
            env_path (str): Path to store env file
        '''
        if self.args.no_ai:
            ai_examples = 'False'
        else:
            ai_examples = 'True'

        config = [
            ['#======================','#'],
            ['#=   LOST Basic config  ','#'],
            ['#======================','#'],
            ['DEBUG','False'],
            ['# Add example pipelines and example images ','#'],
            ['LOST_ADD_EXAMPLES','True'],
            ['#= Add also ai pipelines if true. You will need the lost-cv worker to execute these pipelines.',' #'],
            ['LOST_ADD_AI_EXAMPLES', ai_examples],
            ['LOST_VERSION', self.release],
            ['#= LOST port binding to host machine',' #'],
            ['LOST_FRONTEND_PORT', 80],
            ['SECRET_KEY', self.secret_key],
            ['#= Path to LOST data in host filesystem',' #'],
            ['LOST_DATA', self.dst_data_dir],
            ['#======================','#'],
            ['#= LOST Database config ','#'],
            ['#======================','#'],
            ['LOST_DB_NAME', 'lost'],
            ['LOST_DB_USER', 'lost'],
            ['LOST_DB_PASSWORD', 'LostDbLost'],
            ['LOST_DB_ROOT_PASSWORD', 'LostRootLost'],
            ['PHP_MYADMIN_PORT', 8081], 
            ['#======================','#'],
            ['#=   PipeEngine config  ','#'],
            ['#======================','#'],
            ['# Interval in seconds for the cronjob to update the pipeline',' #'],
            ['PIPE_SCHEDULE', '5'],
            ['# Intervall in seconds in which a worker should give a lifesign',' #'],
            ['WORKER_BEAT', 10],
            ['# Timeout in seconds when a worker is considered to be dead',' #'],
            ['WORKER_TIMEOUT',30],
            ['# Session timout in minutes - timespan when an inactive user is logged out',' #'],
            ['# Also used to schedule a background job that releases locked annotations ',' #'],
            ['SESSION_TIMEOUT',30],
            ['#========================','#'],
            ['#= Your Mail config here ','#'],
            ['#========================','#'],
            ['#MAIL_SERVER','mailserver.com'],
            ['#MAIL_PORT','465'],
            ['#MAIL_USE_SSL','True'],
            ['#MAIL_USE_TLS','True'],
            ['#MAIL_USERNAME','email@email.com'],
            ['#MAIL_PASSWORD','password'],
            ['#MAIL_DEFAULT_SENDER','LOST Notification System <email@email.com>'],
            ['#MAIL_LOST_URL','http://mylostinstance.url/']
        ]
        with open(env_path, 'w') as f:
            for key, val in config:
                f.write('{}={}\n'.format(key, val))
        return
        
    def main(self):
        try:
            os.makedirs(args.install_path)
            logging.info('Created: {}'.format(args.install_path))
        except OSError:
            logging.warning('Path already exists: {}'.format(args.install_path))
            return
        os.makedirs(self.dst_data_dir)
        logging.info('Created: {}'.format(self.dst_data_dir))
        os.makedirs(self.dst_docker_dir)
        logging.info('Created: {}'.format(self.dst_docker_dir))
        # example_config_path = '../compose/prod-docker-compose.yml'
        dst_config = os.path.join(self.dst_docker_dir, 'docker-compose.yml')
        # shutil.copy(example_config_path, dst_config)
        self.write_docker_compose(dst_config)
        env_path = os.path.join(self.dst_docker_dir,'.env')
        self.write_env_config(env_path)
        logging.info('Created {}'.format(env_path))
        logging.info('')
        logging.info('Finished setup! To test LOST run:')
        logging.info('======================================================')
        logging.info('1) Type the command below into your command line:')
        logging.info('   cd {}; docker-compose up'.format(self.dst_docker_dir))
        n = 2
        logging.info('{}) Open your browser and navigate to: http://localhost'.format(n))
        logging.info('    Login user:     admin')
        logging.info('    Login password: admin')
        logging.info('======================================================')



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Quick setup for lost on linux')
    parser.add_argument('install_path', help='Specify path to install lost.')
    parser.add_argument('--release', help='LOST release you want to install.', default=None)
    parser.add_argument('--testing', help='use the LOST images from testing stage.', default=None)
    parser.add_argument('-noai', '--no_ai', help='Do not add ai examples and no lost-cv worker', action='store_true')
    parser.add_argument('--phpmyadmin', help='Add phpmyadmin to docker compose file', action='store_true')
    args = parser.parse_args()
    qs = QuickSetup(args)
    qs.main()