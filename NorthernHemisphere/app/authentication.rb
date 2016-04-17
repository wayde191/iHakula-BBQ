class Authentication

  def initialize(app, provider)
    @app = app
    @provider = provider
  end

  def authenticate_user_if_needed(request)
    unless already_authenticated? or referred_from_ihakula?(request)
      @app.session[:original_url] = request.fullpath
      @app.redirect '/user/auth'
    end

  end

  def user_authentication_succeeded
    @app.session[:authenticated] = true
    original_url = @app.env['rack.session.unpacked_cookie_data']['original_url']
    @app.redirect(original_url)
  end

  def set_user_name(username)
    @app.session[:user_name] = username
  end

  def set_user_id(userid)
    @app.session[:user_id] = userid
  end

  def set_user_email(useremail)
    @app.session[:user_email] = useremail
  end

  def set_user_group_id(groupId)
    @app.session[:group_id] = groupId
  end

  private
  def already_authenticated?
    !@app.session[:authenticated].nil?
  end

  def referred_from_ihakula?(request)
    request.path_info =~ /^\/user\/auth/
  end

end
