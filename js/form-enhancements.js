document.addEventListener('DOMContentLoaded', function() {
    // Enhance file inputs
    document.querySelectorAll('.file-input-wrapper input[type="file"]').forEach(input => {
        const wrapper = input.closest('.file-input-wrapper');
        const button = wrapper.querySelector('.file-input-btn');
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        
        // Add file name display if it doesn't exist
        if (!wrapper.querySelector('.file-name')) {
            button.insertAdjacentHTML('afterend', '<span class="file-name"></span>');
        }
        
        input.addEventListener('change', function(e) {
            const fileNameText = this.files.length > 0 
                ? this.files[0].name 
                : 'Ningún archivo seleccionado';
                
            const fileNameElement = wrapper.querySelector('.file-name');
            fileNameElement.textContent = fileNameText;
            
            if (this.files.length > 0) {
                wrapper.classList.add('has-file');
            } else {
                wrapper.classList.remove('has-file');
            }
        });
    });

    // Add smooth scrolling for form sections
    document.querySelectorAll('.tab-link-desempeno').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-tab');
            const targetElement = document.querySelector(`[data-tab="${targetId}"]`);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add focus styles for better accessibility
    document.querySelectorAll('input, select, textarea, button').forEach(el => {
        el.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        el.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
});
