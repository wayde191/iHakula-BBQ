# encoding: utf-8
# Northern Hemisphere App Entry

require 'log4r'
require 'json'
require 'sinatra'
require 'sinatra/base'
require 'sinatra/config_file'
require 'sinatra/json'
require 'sinatra/cookies'
require 'slim'

require_relative 'authentication'
require_relative 'resources/ihakula_resource'
require_relative 'resources/user_resource'
require_relative 'resources/weixin_resource'
require_relative 'resources/data_resource'
require_relative 'exceptions/external_error'
require_relative 'http/status_code'

class NorthernHemisphereApp < Sinatra::Base
  helpers Sinatra::JSON
  register Sinatra::ConfigFile

  set :root, File.dirname(__FILE__)
  set :public_folder, File.join(settings.root, '..', 'public')
  set :environments, %w{development test prod}
  config_file '../config.yml'

  use Rack::Session::Cookie, {secret: settings.session_secret}

  use UserResource
  use DataResource
  use IhakulaResource
  use WeixinResource

  before do
    unless request_come_from_ihakula
      authentication.authenticate_user_if_needed(request)
    end
  end

  get '/user/auth' do
    slim :loginpage
  end

  get '/' do
    slim :homepage
  end

  get '/database/update' do
    slim :databasepage
  end

  get '/image/:filename' do |filename|
    default_image = 'public/images/goods/default.png'
    file_path = 'public/images/goods/' + filename
    file_path = default_image unless File.readable?(file_path)
    send_file file_path
  end

  get '/favicon.ico' do
    redirect('/')
  end

  # 500
  error ExternalError do
    status 500
  end

  # 404 Error!
  not_found do
    status 404
    '404 Error. Not Found!'
  end

  private

  def authentication
    Authentication.new(self, settings.auth_strategy)
  end

  def request_come_from_ihakula
    params[:ihakula_request] == 'ihakula_northern_hemisphere'
  end

  def base_url
    @base_url ||= "#{request.env['rack.url_scheme']}://#{request.env['HTTP_HOST']}"
  end

end


