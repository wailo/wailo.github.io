DOCKER_BUILDKIT=1 docker build --secret id=mysecret,src=mysecret.txt  -t personal .
