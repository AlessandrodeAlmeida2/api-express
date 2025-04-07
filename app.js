require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
 
const app = express();
const port = 3000;
const cors = require('cors');

// Configuração do CORS para permitir apenas o frontend local
app.use(cors({
  origin: ['http://localhost:5173', 'https://busca-pet-express.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
  credentials: true // Se precisar de credenciais (cookies, autenticação)
}));

// Handler para requisições OPTIONS
app.options('*', cors()); // Responde a todas as requisições OPTIONS

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Rotas
app.get('/', (req, res) => {
    res.send('API funcionando!');
});

app.get('/current-user', async (req, res) => {
    const supabaseAuthHeader = req.headers.authorization; // Captura o cabeçalho Authorization
    
    if (!supabaseAuthHeader) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = supabaseAuthHeader.split(' ')[1]; // Remove "Bearer " para obter o token puro
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Valida o token e recupera os dados do usuário
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
        return res.status(401).json({ message: 'Token inválido', error });
    }

    res.json({ userId: user.id });
});

// Rota para buscar dados de um usuário específico pela tabela 'usuario'
app.get('/user-profile/:userId', async (req, res) => {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'ID do usuário não fornecido' });
    }
    
    try {
      const { data, error } = await supabase
        .from('usuario')  // Usando a tabela 'usuario' em vez de 'tabela1'
        .select('*')
        .eq('id', userId)
        .single();  // Assume que só há um registro por usuário
      
      if (error) {
        return res.status(500).json({ message: 'Erro ao buscar dados do usuário', error });
      }
      
      if (!data) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
  });
  
  // Rota para atualizar dados de um usuário específico
  app.put('/user-profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const { nameUser, cel } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'ID do usuário não fornecido' });
    }
    
    try {
      const { data, error } = await supabase
        .from('usuario')
        .update({ nameUser, cel })
        .eq('id', userId);
      
      if (error) {
        return res.status(500).json({ message: 'Erro ao atualizar dados do usuário', error });
      }
      
      res.status(200).json({ message: 'Dados do usuário atualizados com sucesso' });
    } catch (error) {
      res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
  });

app.get('/usuario/:userId', async (req, res) => {
    const situation = req.query.situation; // Recupera 'situation' da query
    const user_id = req.query.user_id; // Recupera 'user_id' da query
  
    if (!user_id) {
      return res.status(400).json({ message: 'Parâmetro user_id não fornecido' });
    }
  
    try {
      let query = supabase.from('tabela1').select('*');
  
      // Aplica filtros condicionais
      query = query.eq('user_id', user_id); // Filtro pelo user_id
      if (situation) {
        query = query.eq('situation', situation); // Filtro por situation, se fornecido
      }
  
      const { data, error } = await query;
  
      if (error) {
        return res.status(500).json({ message: 'Erro ao buscar dados', error });
      }
  
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
});

app.post('/dados', async (req, res) => {
    const { name, situation, user_id } = req.body;
    const { data, error } = await supabase.from('tabela1').insert([{ name, situation, user_id }]);
    if (error) return res.status(400).send(error);
    res.status(201).json(data);
});

app.put('/dados/:id', async (req, res) => {
    const { id } = req.params;
    const { name, situation } = req.body;
    const { data, error } = await supabase.from('tabela1').update({ name, situation }).eq('id', id);
    if (error) return res.status(400).send(error);
    res.json(data);
});

app.delete('/dados/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('tabela1').delete().eq('id', id);
    if (error) return res.status(400).send(error);
    res.status(204).send();
});

app.delete('/delete-item/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'ID do item não fornecido' });
    }

    try {
        // Obtenha o item a ser deletado para capturar o caminho da imagem
        const { data: item, error: fetchError } = await supabase
            .from('tabela1')
            .select('photo_url')
            .eq('id', id)
            .single();

        if (fetchError || !item) {
            return res.status(404).json({ message: 'Item não encontrado', error: fetchError });
        }

        // Extrair o caminho do arquivo da URL da foto
        const path = item.photo_url.split('/').pop();

        // Remova a imagem do bucket do Supabase
        const { error: storageError } = await supabase
            .storage
            .from('PI_Bucket')
            .remove([path]);

        if (storageError) {
            return res.status(500).json({ message: 'Erro ao remover a imagem do bucket', error: storageError });
        }

        // Deleta o item da tabela
        const { error: deleteError } = await supabase
            .from('tabela1')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return res.status(500).json({ message: 'Erro ao deletar o item da tabela', error: deleteError });
        }

        res.status(200).json({ message: 'Item e imagem removidos com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
});

app.get('/dados', async (req, res) => {
    const situation = req.query.situation;
    let query = supabase.from('tabela1').select('*');

    if (situation) {
        query = query.eq('situation', situation);
    }

    const { data, error } = await query;
    if (error) return res.status(400).send(error);
    res.json(data);
});

app.get('/dados/:id', async (req, res) => {
    const situation = req.query.situation;
    let query = supabase.from('tabela1').select('*');

    if (situation) {
        query = query.eq('situation', situation);
    }

    const { data, error } = await query;
    if (error) return res.status(400).send(error);
    res.json(data);
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
