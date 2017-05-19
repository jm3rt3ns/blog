Rails.application.routes.draw do
  get 'posts/index'

  # posts resource
  resources :posts do
    resources :comments
  end

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root 'posts#index'
end
