console.log('🚀 product-form.js loaded!');

// Check if product-form elements exist in DOM
setTimeout(() => {
  const productForms = document.querySelectorAll('product-form');
  console.log('🔍 Found product-form elements:', productForms.length);
  
  // Check for regular forms too
  const allForms = document.querySelectorAll('form');
  console.log('📝 Found regular form elements:', allForms.length);
  
  // Check for elements with product-form class
  const productFormClass = document.querySelectorAll('.product-form');
  console.log('🎯 Found .product-form class elements:', productFormClass.length);
  
  // Check for error message wrapper
  const errorWrappers = document.querySelectorAll('.product-form__error-message-wrapper');
  console.log('❌ Found error message wrappers:', errorWrappers.length);
  
  productForms.forEach((form, index) => {
    console.log(`📋 Product form ${index}:`, form);
  });
}, 1000);

if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();
        console.log('🏗️ ProductForm constructor called');

        this.form = this.querySelector('form');
        this.form.querySelector('[name=id]').disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form', productVariantId: formData.get('id'), cartData: response });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading-overlay__spinner').classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        console.log('🔍 handleErrorMessage called with:', errorMessage);
        
        if (this.hideErrors) {
          console.log('❌ hideErrors is true, returning');
          return;
        }

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) {
          console.log('❌ No error message wrapper found');
          return;
        }
        
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');
        if (!this.errorMessage) {
          console.log('❌ No error message element found');
          return;
        }

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          console.log('✅ Setting error message text:', errorMessage);
          this.errorMessage.textContent = errorMessage;
          console.log('📝 Error element after setting:', this.errorMessage);
        }
      }
    }
  );
}
