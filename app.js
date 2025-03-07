require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
 
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());

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

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
