
if [ -f /home/Ruby/NorthernHemisphere/shared/pids/unicorn.pid ]; then
    kill -USR2 `cat /home/Ruby/NorthernHemisphere/shared/pids/unicorn.pid`;
else
    cd /home/Ruby/NorthernHemisphere/current/NorthernHemisphere && bundle exec unicorn -c /home/Ruby/NorthernHemisphere/current/NorthernHemisphere/config/unicorn.rb -E development -D;
    fi