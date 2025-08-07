
        let oportunidades = [];
        const OPPORTUNITIES_KEY = 'crm_opportunities';
        let draggedCard = null;
        let draggedFrom = null;
        let currentRating = 0;
        let editingCard = null;
        let modalStage = 'nuevo';

        document.addEventListener('DOMContentLoaded', function() {
            initializeDragAndDrop();
            initializeModalEvents();
            loadOpportunities();
            
            // Configurar fecha de cierre por defecto (7 días desde hoy)
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            document.getElementById('closeDateInput').valueAsDate = nextWeek;
            
            // Manejar selección de empresa
            document.getElementById('companySelect').addEventListener('change', function() {
                const customCompanyGroup = document.getElementById('customCompanyGroup');
                if (this.value === 'other') {
                    customCompanyGroup.style.display = 'block';
                    document.getElementById('customCompanyInput').required = true;
                } else {
                    customCompanyGroup.style.display = 'none';
                    document.getElementById('customCompanyInput').required = false;
                }
            });
        });

        function loadOpportunities() {
            const saved = localStorage.getItem(OPPORTUNITIES_KEY);
            if (saved) {
                oportunidades = JSON.parse(saved);
                renderOpportunities();
            }
        }

        function saveOpportunities() {
            localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(oportunidades));
            renderOpportunities();
        }

        function renderOpportunities() {

            document.querySelectorAll('.cards-container').forEach(container => {
                container.innerHTML = '';
            });

            oportunidades.forEach(opp => {
                const card = createOpportunityCardFromData(opp);
                const column = document.querySelector(`[data-stage="${opp.stage}"] .cards-container`);
                if (column) {
                    column.appendChild(card);
                }
            });

            updateColumnTotals();
        }

        function createOpportunityCardFromData(opp) {
            const card = document.createElement('div');
            card.className = 'opportunity-card';
            card.draggable = true;
            card.dataset.id = opp.id;
            
            Object.keys(opp).forEach(key => {
                card.dataset[key] = opp[key];
            });

            const clientText = opp.company && opp.contact 
                ? `${opp.company}. ${opp.contact}` 
                : opp.contact || '';

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">${opp.opportunityName}</div>
                    <div class="card-actions">
                        <button class="card-action-btn edit" onclick="editCard(this)">🖊️</button>
                    </div>
                </div>
                <div class="card-amount">${opp.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</div>
                <div class="card-client">${clientText}</div>
                <div class="card-rating">
                    ${generateStarRating(opp.rating)}
                </div>
                ${opp.closeDate ? `<div class="card-date" style="font-size: 12px; color: #6c757d; margin-top: 4px;">📅 ${formatDate(opp.closeDate)}</div>` : ''}
            `;

            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            
            return card;
        }

        function openModal(stage = 'nuevo', card = null) {
            modalStage = stage;
            editingCard = card;
            
            const modal = document.getElementById('opportunityModal');
            const stageTag = document.getElementById('modalStageTag');
            const modalTitle = document.getElementById('modalTitle');
            const saveButton = document.getElementById('saveButton');
            const deleteButton = document.getElementById('deleteButton');

            if (card) {
                modalTitle.textContent = 'Editar Oportunidad';
                saveButton.textContent = 'Guardar';
                deleteButton.style.display = 'block';
                loadCardDataToForm(card);
            } else {
                modalTitle.textContent = 'Nueva Oportunidad';
                saveButton.textContent = 'Agregar';
                deleteButton.style.display = 'none';
                clearForm();
            }

            stageTag.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            document.getElementById('opportunityNameInput').focus();
        }

        function closeModal() {
            const modal = document.getElementById('opportunityModal');
            modal.classList.remove('active');
            document.body.style.overflow = '';
            editingCard = null;
            currentRating = 0;
        }

        function clearForm() {
            document.getElementById('opportunityForm').reset();
            currentRating = 0;
            highlightStars(0);
            
            // Restablecer fecha de cierre a 7 días desde hoy
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            document.getElementById('closeDateInput').valueAsDate = nextWeek;

            document.getElementById('customCompanyGroup').style.display = 'none';
        }

        function loadCardDataToForm(card) {

            const opportunityData = {
                id: card.dataset.id,
                company: card.dataset.company,
                contact: card.dataset.contact,
                opportunityName: card.dataset.opportunityname,
                email: card.dataset.email,
                phone: card.dataset.phone,
                amount: parseFloat(card.dataset.amount),
                rating: parseInt(card.dataset.rating),
                closeDate: card.dataset.closedate,
                source: card.dataset.source,
                notes: card.dataset.notes,
                stage: card.dataset.stage
            };

            document.getElementById('opportunityNameInput').value = opportunityData.opportunityName;
            document.getElementById('amountInput').value = opportunityData.amount;
            document.getElementById('contactInput').value = opportunityData.contact;
            document.getElementById('emailInput').value = opportunityData.email || '';
            document.getElementById('phoneInput').value = opportunityData.phone || '';
            document.getElementById('closeDateInput').value = opportunityData.closeDate || '';
            document.getElementById('sourceSelect').value = opportunityData.source || '';
            document.getElementById('notesInput').value = opportunityData.notes || '';
            setRating(opportunityData.rating);

            // Manejar selección de empresa
            if (opportunityData.company) {
                const isCustomCompany = !['Hardware express', 'Junicon', 'MC donalds', 'ABC Electronics'].includes(opportunityData.company);
                if (isCustomCompany) {
                    document.getElementById('companySelect').value = 'other';
                    document.getElementById('customCompanyInput').value = opportunityData.company;
                    document.getElementById('customCompanyGroup').style.display = 'block';
                } else {
                    document.getElementById('companySelect').value = opportunityData.company;
                }
            }
        }

        function saveOpportunity() {
            const form = document.getElementById('opportunityForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const company = document.getElementById('companySelect').value === 'other' 
                ? document.getElementById('customCompanyInput').value 
                : document.getElementById('companySelect').value;
            
            const opportunityData = {
                id: editingCard ? editingCard.dataset.id : 'opp-' + Date.now(),
                company: company,
                contact: document.getElementById('contactInput').value,
                opportunityName: document.getElementById('opportunityNameInput').value,
                email: document.getElementById('emailInput').value,
                phone: document.getElementById('phoneInput').value,
                amount: parseFloat(document.getElementById('amountInput').value),
                rating: currentRating,
                closeDate: document.getElementById('closeDateInput').value,
                source: document.getElementById('sourceSelect').value,
                notes: document.getElementById('notesInput').value,
                stage: modalStage,
                createdAt: editingCard ? editingCard.dataset.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (editingCard) {
                const index = oportunidades.findIndex(opp => opp.id === editingCard.dataset.id);
                if (index !== -1) {
                    oportunidades[index] = opportunityData;
                }
            } else {
                oportunidades.push(opportunityData);
            }

            saveOpportunities();
            closeModal();
            showNotification(editingCard ? 'Oportunidad actualizada' : 'Nueva oportunidad creada');
        }

        function deleteOpportunity() {
            if (editingCard && confirm('¿Estás seguro de que deseas eliminar esta oportunidad?')) {
                const index = oportunidades.findIndex(opp => opp.id === editingCard.dataset.id);
                if (index !== -1) {
                    oportunidades.splice(index, 1);
                    saveOpportunities();
                }
                closeModal();
                showNotification('Oportunidad eliminada');
            }
        }

        function setRating(rating) {
            currentRating = rating;
            highlightStars(rating);
        }

        function highlightStars(rating) {
            const starBtns = document.querySelectorAll('.star-btn');
            starBtns.forEach((btn, index) => {
                if (index < rating) {
                    btn.classList.add('active');
                    btn.textContent = '★';
                } else {
                    btn.classList.remove('active');
                    btn.textContent = '☆';
                }
            });
        }

        function generateStarRating(rating) {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += i <= rating ? '<span class="star">★</span>' : '<span class="star empty">☆</span>';
            }
            return stars;
        }

        function formatDate(dateString) {
            if (!dateString) return '';
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('es-ES', options);
        }

        function formatCurrency(amount) {
            if (amount >= 1000000) {
                return (amount / 1000000).toFixed(0) + 'M Q';
            } else if (amount >= 1000) {
                return (amount / 1000).toFixed(0) + 'k Q';
            }
            return amount.toLocaleString('es-ES') + ' Q';
        }

        function initializeDragAndDrop() {
            const columns = document.querySelectorAll('.cards-container');

            columns.forEach(column => {
                column.addEventListener('dragover', handleDragOver);
                column.addEventListener('drop', handleDrop);
                column.addEventListener('dragenter', handleDragEnter);
                column.addEventListener('dragleave', handleDragLeave);
            });
        }

        function handleDragStart(e) {
            draggedCard = this;
            draggedFrom = this.closest('.kanban-column').dataset.stage;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');
            draggedCard = null;
            draggedFrom = null;
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }

        function handleDragEnter(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        }

        function handleDragLeave(e) {
            this.classList.remove('drag-over');
        }

        function handleDrop(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            if (draggedCard) {
                const targetStage = this.closest('.kanban-column').dataset.stage;

                const opportunityId = draggedCard.dataset.id;
                const opportunity = oportunidades.find(opp => opp.id === opportunityId);
                if (opportunity) {
                    opportunity.stage = targetStage;
                    opportunity.updatedAt = new Date().toISOString();
                    saveOpportunities();
                }
                
                showNotification(`Oportunidad movida a ${targetStage}`);
            }
        }

        function updateColumnTotals() {
            const columns = document.querySelectorAll('.kanban-column');
            
            columns.forEach(column => {
                const stage = column.dataset.stage;
                const opportunitiesInStage = oportunidades.filter(opp => opp.stage === stage);
                let total = 0;
                
                opportunitiesInStage.forEach(opp => {
                    total += opp.amount;
                });
                
                const totalElement = column.querySelector('.column-total');
                if (total > 0) {
                    totalElement.textContent = formatCurrency(total);
                } else {
                    totalElement.textContent = '0 Q';
                }
            });
        }

        function editCard(button) {
            const card = button.closest('.opportunity-card');
            const stage = card.closest('.kanban-column').dataset.stage;
            openModal(stage, card);
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #20c997;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: 500;
                z-index: 9999;
                animation: slideIn 0.3s ease;
            `;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }

        function initializeModalEvents() {
            const starBtns = document.querySelectorAll('.star-btn');
            starBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const rating = parseInt(this.dataset.rating);
                    setRating(rating);
                });
                
                btn.addEventListener('mouseenter', function() {
                    const rating = parseInt(this.dataset.rating);
                    highlightStars(rating);
                });
            });

            document.querySelector('.star-rating').addEventListener('mouseleave', function() {
                highlightStars(currentRating);
            });

            const formFields = document.querySelectorAll('.form-field');
            formFields.forEach(field => {
                const input = field.querySelector('.form-input, .form-select, textarea');
                if (input) {
                    input.addEventListener('focus', () => field.classList.add('focused'));
                    input.addEventListener('blur', () => field.classList.remove('focused'));
                }
            });
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
