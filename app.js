require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
 
const app = express();
const port = 3000;

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Rotas
app.get('/', (req, res) => {
    res.send('API funcionando!');
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

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
