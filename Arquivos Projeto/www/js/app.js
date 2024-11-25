document.addEventListener('deviceready', () => {
    const db = window.sqlitePlugin.openDatabase({ name: 'fitness.db', location: 'default' });

    // Criar tabelas
    db.transaction(tx => {
        tx.executeSql('CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, nome TEXT, email TEXT, senha TEXT)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS objetivos (id INTEGER PRIMARY KEY, userId INTEGER, objetivo TEXT)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS anotacoes (id INTEGER PRIMARY KEY, userId INTEGER, texto TEXT)');
    });

    let currentUser = null;

    // Mostrar telas
    const showScreen = (screenId) => {
        document.querySelectorAll('#app > div').forEach(screen => {
            screen.style.display = 'none';
        });
        document.getElementById(screenId).style.display = 'block';
    };

    // Cadastro
    window.cadastrar = () => {
        const nome = document.getElementById('nomeCadastro').value;
        const email = document.getElementById('emailCadastro').value;
        const senha = document.getElementById('senhaCadastro').value;

        if (!nome || !email || !senha) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        db.transaction(tx => {
            tx.executeSql('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, senha], () => {
                alert('Cadastro realizado com sucesso!');
                showScreen('loginForm');
            }, () => {
                alert('Erro ao cadastrar. Tente novamente.');
            });
        });
    };

    // Login
    window.login = () => {
        const email = document.getElementById('emailLogin').value;
        const senha = document.getElementById('senhaLogin').value;

        db.transaction(tx => {
            tx.executeSql('SELECT * FROM usuarios WHERE email = ? AND senha = ?', [email, senha], (tx, result) => {
                if (result.rows.length > 0) {
                    currentUser = result.rows.item(0);
                    document.getElementById('userName').textContent = currentUser.nome;
                    showScreen('bemVindoForm');
                } else {
                    alert('Email ou senha inválidos.');
                }
            });
        });
    };

    // Alterar Cadastro
    window.alterarCadastro = () => {
        const novoNome = document.getElementById('alterarNome').value;
        const novoEmail = document.getElementById('alterarEmail').value;
        const novaSenha = document.getElementById('alterarSenha').value;

        if (!novoNome && !novoEmail && !novaSenha) {
            alert('Por favor, preencha pelo menos um campo.');
            return;
        }

        db.transaction(tx => {
            tx.executeSql('UPDATE usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?', [
                novoNome || currentUser.nome,
                novoEmail || currentUser.email,
                novaSenha || currentUser.senha,
                currentUser.id,
            ], () => {
                alert('Dados alterados com sucesso!');
                currentUser.nome = novoNome || currentUser.nome;
                currentUser.email = novoEmail || currentUser.email;
                currentUser.senha = novaSenha || currentUser.senha;
                document.getElementById('userName').textContent = currentUser.nome;
                showScreen('bemVindoForm');
            });
        });
    };

    // Adicionar Objetivo
    window.adicionarObjetivo = () => {
        const objetivo = document.getElementById('objetivoSelect').value;

        db.transaction(tx => {
            tx.executeSql('SELECT * FROM objetivos WHERE userId = ?', [currentUser.id], (tx, result) => {
                if (result.rows.length > 0) {
                    alert('Você já possui um objetivo cadastrado. Altere-o se necessário.');
                } else {
                    tx.executeSql('INSERT INTO objetivos (userId, objetivo) VALUES (?, ?)', [currentUser.id, objetivo], () => {
                        listarObjetivoAtual();
                    });
                }
            });
        });
    };

    // Listar Objetivo Atual
    const listarObjetivoAtual = () => {
        db.transaction(tx => {
            tx.executeSql('SELECT * FROM objetivos WHERE userId = ?', [currentUser.id], (tx, result) => {
                if (result.rows.length > 0) {
                    const objetivo = result.rows.item(0).objetivo;
                    document.getElementById('objetivoEscolhidoTexto').textContent = objetivo;
                    document.getElementById('orientacaoTexto').textContent = gerarOrientacao(objetivo);
                    document.getElementById('objetivoNaoEscolhido').style.display = 'none';
                    document.getElementById('objetivoEscolhido').style.display = 'block';
                    document.getElementById('orientacoes').style.display = 'block';
                }
            });
        });
    };

    // Alterar Objetivo
    window.showAlterarObjetivoForm = () => {
        db.transaction(tx => {
            tx.executeSql('DELETE FROM objetivos WHERE userId = ?', [currentUser.id], () => {
                document.getElementById('objetivoNaoEscolhido').style.display = 'block';
                document.getElementById('objetivoEscolhido').style.display = 'none';
                document.getElementById('orientacoes').style.display = 'none';
            });
        });
    };

    // Gerar Orientações de Treino e Dieta
    const gerarOrientacao = (objetivo) => {
        switch (objetivo) {
            case 'ganhar massa muscular':
                return 'Treino: Foco em musculação com cargas progressivas.\nDieta: Alta em proteínas e calorias.';
            case 'manter peso':
                return 'Treino: Mantenha exercícios regulares e equilibrados.\nDieta: Controle calórico e mantenha hábitos saudáveis.';
            case 'emagrecer':
                return 'Treino: Priorize exercícios aeróbicos e força.\nDieta: Déficit calórico com alimentação balanceada.';
            default:
                return 'Sem orientações disponíveis.';
        }
    };

    // Anotações
    window.adicionarAnotacao = () => {
        const texto = document.getElementById('anotacaoInput').value;
        if (!texto) return;

        db.transaction(tx => {
            tx.executeSql('INSERT INTO anotacoes (userId, texto) VALUES (?, ?)', [currentUser.id, texto], () => {
                listarAnotacoes();
                document.getElementById('anotacaoInput').value = '';
            });
        });
    };

    const listarAnotacoes = () => {
        const lista = document.getElementById('listaAnotacoes');
        lista.innerHTML = '';

        db.transaction(tx => {
            tx.executeSql('SELECT * FROM anotacoes WHERE userId = ?', [currentUser.id], (tx, result) => {
                for (let i = 0; i < result.rows.length; i++) {
                    const item = result.rows.item(i);
                    lista.innerHTML += `
                        <li>
                            ${item.texto}
                            <button class="edit" onclick="editarAnotacao(${item.id}, '${item.texto}')">Editar</button>
                            <button onclick="deletarAnotacao(${item.id})">Excluir</button>
                        </li>
                    `;
                }
            });
        });
    };

    // Editar Anotação
    window.editarAnotacao = (id, texto) => {
        const novoTexto = prompt('Editar anotação:', texto);
        if (novoTexto !== null) {
            db.transaction(tx => {
                tx.executeSql('UPDATE anotacoes SET texto = ? WHERE id = ?', [novoTexto, id], () => {
                    listarAnotacoes();
                });
            });
        }
    };

    // Deletar Anotação
    window.deletarAnotacao = (id) => {
        const confirmacao = confirm('Você tem certeza que deseja excluir esta anotação?');
        if (confirmacao) {
            db.transaction(tx => {
                tx.executeSql('DELETE FROM anotacoes WHERE id = ?', [id], () => {
                    listarAnotacoes();
                });
            });
        }
    };

    // Navegação inicial
    window.showCadastroForm = () => showScreen('cadastroForm');
    window.showLoginForm = () => showScreen('loginForm');
    window.showBemVindoForm = () => showScreen('bemVindoForm');
    window.showObjetivoForm = () => {
        showScreen('objetivoForm');
        listarObjetivoAtual();
    };
    window.showAnotacoesForm = () => {
        showScreen('anotacoesForm');
        listarAnotacoes();
    };
    window.showAlterarCadastroForm = () => showScreen('alterarCadastroForm');

    // Logout
    window.logout = () => {
        currentUser = null;
        showScreen('loginForm');
    };

    // Inicialização
    showScreen('loginForm');
});