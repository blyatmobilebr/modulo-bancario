const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const bancodedados = JSON.parse(fs.readFileSync(path.join(__dirname, "bancodedados.json")))


app.use(express.json());

app.get("/", (req, res) => {
    res.send(bancodedados).status(200);
})

app.get("/contas", (req, res) => {
    const {senha_banco} = req.query;
    
    if (!senha_banco) return res.json({mensagem: "Senha não informada!"}).status(404);

    else {
        const conta = bancodedados.contas.find(conta => conta.usuario.senha === senha_banco);

        if (conta) return res.send(conta).status(200);
        else return res.json({mensagem: "Conta não existente!"}).status(404);
    }
})

app.post("/contas", (req, res) => {
    const { nome, cpf, data_nascimento, telefone, email, senha } = req.query;
  
    if (!nome || !cpf || !data_nascimento || !telefone || !email || !senha) {
      return res.status(400).json({ mensagem: "TODOS os campos são obrigatórios!" });
    }
  
    const cpfExistente = bancodedados.contas.find(conta => conta.usuario.cpf === cpf);

    if (cpfExistente) {
        return res.status(400).json({ mensagem: "CPF já cadastrado!" });
    }
  
    const emailExistente = bancodedados.contas.find(conta => conta.usuario.email === email);

    if (emailExistente) {
        return res.status(400).json({ mensagem: "E-mail já cadastrado!" });
    }
    
    const novaConta = {
        numero: bancodedados.contas.length + 1,
        saldo: 0,
        usuario: {
        nome,
        cpf,
        data_nascimento,
        telefone,
        email,
        senha,
        },
    };
  
    bancodedados.contas.push(novaConta);

    fs.writeFileSync(
        path.join(__dirname, "bancodedados.json"),
        JSON.stringify(bancodedados, null, 4),
        "utf8"
    );

  res.json({ mensagem: "Conta criada!" }).status(201);
    
  });
  

  app.put("/contas/:numeroConta/usuario", (req, res) => {
    const { nome, cpf, data_nascimento, telefone, email, senha } = req.query;
    const { numeroConta } = req.params;
  
    if (!nome || !cpf || !data_nascimento || !telefone || !email || !senha) {
      return res
        .json({ mensagem: "TODOS os campos são obrigatórios!" })
        .status(400);
    }
  
    const contaEncontrada = bancodedados.contas.find(conta => conta.numero === Number(numeroConta));
    if (!contaEncontrada) {
        return res.json({ mensagem: "Conta não encontrada" }).status(400);
    }
  
    if (contaEncontrada.usuario.cpf !== cpf) {
        const contaExistenteCPF = bancodedados.contas.find(conta => conta.usuario.cpf === cpf);
        if (contaExistenteCPF) {
        return res.json({ mensagem: "Já existe outra conta com o mesmo CPF" }).status(400);
        }

        contaEncontrada.usuario.cpf = cpf;
    }
  
    if (contaEncontrada.usuario.email !== email) {
        const contaExistenteEmail = bancodedados.contas.find(conta => conta.usuario.email === email);
        if (contaExistenteEmail) {
            return res.json({ mensagem: "Já existe outra conta com o mesmo E-mail" }).status(400);
        }

        contaEncontrada.usuario.email = email;
    }
    
    fs.writeFileSync(
      path.join(__dirname, "bancodedados.json"),
      JSON.stringify(bancodedados, null, 4),
      "utf8"
    );
  
    res.json({ mensagem: "Dados do usuário atualizados com sucesso" }).status(200);
  });
  

app.delete("/contas/:numeroConta", (req, res) => {
    const { numeroConta } = req.params;
  
    const contaEncontrada = bancodedados.contas.find(
        (conta) => conta.numero === Number(numeroConta)
    );
    
    if (!contaEncontrada) {
        return res.json({ mensagem: "Conta não encontrada!" }).status(404);
    } 
    else if (contaEncontrada.saldo > 0) {
        return res
        .json({
            mensagem: "Não é possível deletar a conta pois o saldo é maior que 0.",
        })
        .status(400);
    } 
    else {
        const contasFiltradas = bancodedados.contas.filter(
            (conta) => conta.numero !== Number(numeroConta)
        );
  
      bancodedados.contas = contasFiltradas;
  
        fs.writeFileSync(
            path.join(__dirname, "bancodedados.json"),
            JSON.stringify(bancodedados, null, 4),
            "utf8"
        );
  
      res.json({ mensagem: "Conta removida!" }).status(200);
    }
});

app.post("/transacoes/depositar", (req, res) => {
    const {numero_conta, valor} = req.query;

    if(!numero_conta || !valor) return res.json({ mensagem: "TODOS os campos são obrigatórios!"}).status(404);

    const contaEncontrada = bancodedados.contas.find(conta => conta.numero === Number(numero_conta));

    if (!contaEncontrada) return res.json({ mensagem: "A conta não existe!"}).status(404);

    else if (valor >= 0) {
        contaEncontrada.saldo = Number(contaEncontrada.saldo) + Number(valor);

        bancodedados.depositos.push({
            data: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo"}),
            numero_conta,
            valor
        });

        fs.writeFileSync(
            path.join(__dirname, "bancodedados.json"),
            JSON.stringify(bancodedados, null, 4),
            "utf8"
        );

        res.json({mensagem: "Depósito feito!"}).status(201);
    }
})

app.post("/transacoes/saque", (req, res) => {
    const {numero_conta, valor, senha} = req.query;

    const contaEncontrada = bancodedados.contas.find(conta => conta.numero === Number(numero_conta));

    if (!contaEncontrada) return res.json({ mensagem: "A conta não existe!" }).status(404);
    else if (contaEncontrada.usuario.senha !== senha) {
        return res.json({ mensagem: "Senha inválida!" }).status(404);
    }

    else if (Number(valor) <= contaEncontrada.saldo) {
        contaEncontrada.saldo -= Number(valor);

        bancodedados.saques.push({
            data: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo"}),
            numero_conta,
            valor
        });

        fs.writeFileSync(
            path.join(__dirname, "bancodedados.json"),
            JSON.stringify(bancodedados, null, 4),
            "utf8"
        );

        res.json({mensagem: "Saque feito!"}).status(200);
    }
})

app.post("/transacoes/transferir", (req, res) => {
    const { numero_conta_origem, numero_conta_destino, valor, senha_origem } = req.query;
  
    if (!numero_conta_destino || !numero_conta_origem || !valor || !senha_origem) {
        return res.status(400).json({ mensagem: "TODOS os campos são obrigatórios!" });
    }
  
    const contaOrigem = bancodedados.contas.find((conta) => conta.numero === Number(numero_conta_origem));
    const contaDestino = bancodedados.contas.find((conta) => conta.numero === Number(numero_conta_destino));
  
    if (!contaOrigem || !contaDestino) {
        return res.json({ mensagem: "Conta de origem ou conta de destino não encontrada!" }).status(404)
    }
  
    if (contaOrigem.usuario.senha !== senha_origem) {
        return res.json({ mensagem: "Senha inválida!" }).status(400)
    }
  
    if (contaOrigem.saldo < valor) {
        return res.json({ mensagem: "Saldo insuficiente!" }).status(400)
    }
  
    contaOrigem.saldo -= Number(valor);
    contaDestino.saldo += Number(valor);
  
    const transferencia = {
        data: new Date().toLocaleString("pt-BR"),
        numero_conta_origem: contaOrigem.numero,
        numero_conta_destino: contaDestino.numero,
        valor: Number(valor) * 100,
    };
  
    bancodedados.transferencias.push(transferencia);
  
    fs.writeFileSync(
        path.join(__dirname, "bancodedados.json"),
        JSON.stringify(bancodedados, null, 4),
        "utf8"
    );
  
    res.status(200).json({ mensagem: "Transferência realizada com sucesso!" });
  });
  

app.get("/contas/saldo", (req, res) => {
    const {numero_conta, senha} = req.query;
    const contaEncontrada = bancodedados.contas.find(conta => conta.numero === Number(numero_conta));
    
    if (!contaEncontrada) {
        return res.json({ mensagem: "Conta não encontrada!" }).status(404);
    }

    else if (senha !== contaEncontrada.senha) {
        return res.json({mensagem: "Senha inválida"}).status(404);
    }

    else {
        res.json({
            saldo: contaEncontrada.saldo
        }).status(200);
    }
})

app.get("/contas/extrato", (req, res) => {
    const {numero_conta, senha} = req.query;

    if(!numero_conta || ! senha) return res.json({mensagem: "TODOS os campos obrigatórios!"}).status(404);
    
    const contaEncontrada = bancodedados.contas.find(conta => conta.numero === Number(numero_conta)
    );

    if(!contaEncontrada.usuario.senha) {
        return res.json({mensagem: "Senha inválida!"}).status(404);
    }

    else {
        const depositosConta = bancodedados.depositos.filter(deposito => deposito.numero_conta === numero_conta)

        const saquesConta = bancodedados.saques.filter(saque => saque.numero_conta === numero_conta)

        const transferenciasEnviadas = bancodedados.transferencias.filter(transf => transf.numero_conta_origem === numero_conta)

        const transferenciasRecebidas = bancodedados.transferencias.filter(transf => transf.numero_conta_destino === numero_conta)

        res.json({
            depositos: depositosConta,
            saques: saquesConta,
            transferenciasEnviadas,
            transferenciasRecebidas

        }).status(200);
    }
})
  

app.listen(2222,() => console.log("to aqui"));