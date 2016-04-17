require 'rvm/capistrano'
set :rvm_ruby_string, '1.9.3'
set :rvm_type, :system

# Bundler tasks
require 'bundler/capistrano'

# Your application name
set :application, "NorthernHemisphere"
set :bundle_gemfile, "#{application}/Gemfile"

# Input your git repository address
set :scm, :subversion
set :repository, "http://112.124.41.173/svn/repos/workspace/Ruby/"

# do not use sudo
set :use_sudo, false
set(:run_method) { use_sudo ? :sudo : :run }

# This is needed to correctly handle sudo password prompt
default_run_options[:pty] = true

# Input your username to login remote server address
set :user, 'root'
set :group, user
set :runner, user

# Input your server address
set :host, "#{user}@112.124.41.173"
role :web, host
role :app, host

set :rails_env, :development

# Where will it be located on a server?
set :deploy_to, "/home/Ruby/#{application}"
set :unicorn_conf, "#{deploy_to}/current/#{application}/config/unicorn.rb"
set :unicorn_pid, "#{deploy_to}/shared/pids/unicorn.pid"

# Unicorn control tasks
namespace :deploy do
  task :restart do
    run "if [ -f #{unicorn_pid} ]; then kill -USR2 `cat #{unicorn_pid}`; else cd #{deploy_to}/current/#{application} && bundle exec unicorn -c #{unicorn_conf} -E #{rails_env} -D; fi"
  end
  task :start do
    run "cd #{deploy_to}/current/#{application} && bundle exec unicorn -c #{unicorn_conf} -E #{rails_env} -D"
  end
  task :stop do
    run "if [ -f #{unicorn_pid} ]; then kill -QUIT `cat #{unicorn_pid}`; fi"
  end
end
