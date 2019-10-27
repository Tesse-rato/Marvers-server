const http = require("http");
const crypto = require("crypto");

const MARVEL_KEY = process.env.MARVEL_KEY;
const MARVEL_SEC = process.env.MARVEL_SEC;

let allCharacter = [];
const totalCharacters = 1493;

let auth = {
  baseURL: '',
  ts: '',
  token: '',
  apikey: MARVEL_KEY
}

exports.searchCharacter = (req, res) => {

  if(allCharacter.length < totalCharacters) return res.status(202).send({details: 'A pilha de personagem ainda não foi montada, mas continue tentando!'});
  
  const { search } = req.params;
  const regex = new RegExp(search, 'gi');

  let response = [];

  for (index in allCharacter) {
    if(regex.test(allCharacter[index].name)){
      response.push(allCharacter[index]);
    }
    if(response.length >= 40){
      break;
    }
  }

  res.send({results: response, total: response.length, search});

}

exports.getToken = (req, res) => {

  /**
   * 
   * Essa rota é pro client do app pegar um token secreto com segurança
   * Duas variaveis de ambiente deve estar configurada 
   *  MARVEL_KEY = ChavePublica
   *  MARVEL_SEC = ChaveSecreta
   * 
   * Se essas duas Variaveis de Ambiente estiver faltando é retornado um erro 500 pro cliente
   *  - Segue uma mensagem para configurar as Variaveis de Ambiente
   * 
   * Se as duas chaves estiverem configuradas a API vai testar uma rota da API
   *  - Se der erro na requesição de teste segeue uma mensagem para verificar as chaves
   */

  if (!MARVEL_KEY || !MARVEL_SEC) return res.status(500).send({
    error: 'Missing authentication keys on server-side',
    descritption: `Crie uma conta na https://developer.marvel.com ative sua conta siga as instruções para gerar uma APIKEY
      Após isso configure duas variavéis de ambiente no setup e atualize as varaiveis de ambiente mo terminal
      MARVEL_KEY= APIKEY // Chave pública
      MARVEL_SEC= SECRET // Chave secreta 
    `
  });

  const ts = "10";
  const hash = crypto.createHash('md5').update(ts + MARVEL_SEC + MARVEL_KEY).digest('hex');
  const baseURL = 'gateway.marvel.com';
  const query = `?ts=${ts}&apikey=${MARVEL_KEY}&hash=${hash}`;

  auth = {
    ...auth,
    ts,
    query,
    baseURL,
    token: hash,
  }

  res.send(auth);

  if (!allCharacter.length) getAllCharacters();

}

function getAllCharacters() {

  let offset = 0;
  const limit = 100;
  const {baseURL: host} = auth;
  
  getCharacter();
  function getCharacter() {
    const path = `/v1/public/characters${auth.query}&offset=${offset}&limit=${limit}`;
    client({
      host,
      path
    }).then(({ data: { results } }) => {
      if (offset < totalCharacters) {
        offset += limit;
        allCharacter = [...allCharacter, ...results];
        console.log(path);
        setTimeout(() => getCharacter(), 500);
      }
      else {
        console.log('Pegou todos Characteres por ordem alfabetica', allCharacter.length);
      }
    }).catch(console.log);
  }
}

function client({ host, path }) {
  return new Promise((resolve, reject) => {
    try {
      const key_req = http.request({
        host,
        path,
        port: 80,
      }, (response) => {
        let body = '';

        response.on('data', data => body += data);
        response.on('error', err => reject(err));

        response.on('end', () => {

          body = JSON.parse(body);

          if (body.code === 'InvalidCredentials') return reject({
            data: body,
            error: 'Problaby your keys given is wrong!',
            descritption: 'As chaves na varivel de ambiente foi recuperada com sucesso, mas confere se as chaves fornecidas estão corretas'
          });

          // Se toda requisação for completada é retornado todo dado necessário para uma autenticação na API da Marvel
          resolve(body);
        });
      });

      key_req.end();

    } catch (err) {
      reject(err);
    }

  });
}