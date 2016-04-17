require 'sinatra/base'
require 'sinatra/config_file'
require 'sinatra/json'
require 'json'
require 'sinatra/cookies'

require_relative '../authentication'
require_relative '../stores/ihakula_store'
require_relative '../log/log_formatter'
require_relative '../log/log_wrapper'

class UserResource < Sinatra::Base

  helpers Sinatra::JSON
  register Sinatra::ConfigFile
  set :environments, %w{development test prod}
  config_file '../../config.yml'

  post '/user/auth' do
    username = params[:username]
    password = params[:password]
    write_request_details_to_log('/user/login', request, params)
    user = ihakula_store.login(username, password)
    user_nickname = user[:user_nickname]
    user_id = user[:ID]
    user_email = user[:user_email]
    user_group_id = user[:group_id]
    authentication.set_user_name user_nickname
    authentication.set_user_id user_id
    authentication.set_user_email user_email
    authentication.set_user_group_id user_group_id
    authentication.user_authentication_succeeded
  end

  post '/user/upload/contact' do
    write_request_details_to_log('UserResource', request, '{user:upload/contact}')
    json ihakula_store.user_upload_contact params
  end

  post '/user/get/contact' do
    write_request_details_to_log('UserResource', request, '{user:get/contact}')
    json ihakula_store.user_get_contact params
  end

  private

  def authentication
    Authentication.new(self, settings.auth_strategy)
  end

  def ihakula_store
    IhakulaStore.new(settings)
  end

  def write_request_details_to_log(action, request, request_parameters)
    @logger = LogWrapper.new(LogFormatter.new, settings)
    @logger.info_details(action, request, request_parameters, 'IhakulaResource')
  end

end
