# rm -rf node_modules/
# export PEM_PATH="./clal-beast-key.pem"
# export EC2_USER="ubuntu"
# export EC2_HOSTNAME="ec2-3-250-92-84.eu-west-1.compute.amazonaws.com"
# ssh -i $PEM_PATH $EC2_USER@$EC2_HOSTNAME "rm -rf cflog-analyzer"
# scp -i $PEM_PATH -r ../cflog-analyzer $EC2_USER@$EC2_HOSTNAME:~/
# scp -i $PEM_PATH ~/.aws/credentials ubuntu@$EC2_HOSTNAME:/home/ubuntu/.aws


# show the commands
set -x

export GCP_USER="bart"
export HOST_IP="34.140.85.181"

rm -rf node_modules/
rm package-lock.json

ssh $GCP_USER@$HOST_IP "rm -rf /home/$GCP_USER/cflog-analyzer"
rsync -avz --exclude='.git' ../cflog-analyzer/ $GCP_USER@$HOST_IP:/home/$GCP_USER/cflog-analyzer/
scp ~/.aws/credentials $GCP_USER@$HOST_IP:/home/$GCP_USER/.aws