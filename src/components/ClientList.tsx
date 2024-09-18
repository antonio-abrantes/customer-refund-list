import { useEffect, useState, useContext } from "react";
import toast, { Toaster } from "react-hot-toast";

import { AuthContext } from "../context/AuthContext";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFirstName(fullName: string) {
  if (!fullName) return "";

  const firstName = fullName.split(" ")[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function calcularRestituicao(client: Client) {
  const totalAmount = Number(
    +client.total_amount + Number(client.discount_amount ?? 0)
  ).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const finalAmount = parseFloat(client.total_amount).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const discountAmount = client.discount_amount
    ? parseFloat(client.discount_amount).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : null;
  // const quantity = client.quantity;

  if (discountAmount) {
    return `Pedimos para que verifique se o valor: *${finalAmount}*`;
  } else {
    return `Pedimos para que verifique se o valor: *${totalAmount}*`;
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiKey = import.meta.env.VITE_API_KEY;
const botName = import.meta.env.VITE_BOT_NAME;
// const phoneTest = import.meta.env.VITE_PHONE_FOR_TEST;

type ClientStatus = "paid" | "pending" | "cancelled" | "refunded";

interface Client {
  id: string;
  code: string;
  fullname: string;
  phone: string;
  cpf: string;
  quantity: number;
  total_amount: string;
  discount_amount: string;
  final_amount: string;
  status: string;
}

async function updateClientStatus(client: Client, newStatus: ClientStatus) {
  const url = `${apiBaseUrl}/process/customers/status`;
  const body = {
    id: client.id,
    code: client.code,
    status: newStatus,
  };

  console.log(body);

  const headers = {
    "Content-Type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };

  // return;
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Cliente atualizado com sucesso:", data);

    return data;
  } catch (error) {
    console.error("Erro ao atualizar o status do cliente:", error);
    throw error;
  }
}

async function sendMessage(client: Client, message: string) {
  const url = `${apiBaseUrl}/evoRoutes/sendMessage`;
  console.log(client);

  const body = {
    botName: botName,
    number: "55" + client.phone,
    textMessage: message,
  };
  const headers = {
    "Content-Type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Resposta da API:", data);
    return true;
  } catch (error) {
    console.error("Erro ao enviar a mensagem:", error);
    throw error;
  }
}

const ClientList = () => {
  const { logout } = useContext(AuthContext)!;
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    const fetchClients = async () => {
      const url = `${apiBaseUrl}/process/customers?status=`;
      const headers = {
        "Content-Type": "application/json",
        authorization: `Bearer ${apiKey}`,
      };

      try {
        const response = await fetch(url, { method: "GET", headers });
        if (!response.ok) {
          throw new Error(`Erro: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        const fetchedClients = result.data as Client[];

        const sortedClients = [...fetchedClients]
          .filter((client) =>
            selectedStatus !== "all" ? client.status === selectedStatus : true
          )
          .sort((a, b) => a.fullname.localeCompare(b.fullname));
        console.log(sortedClients);
        setClients(sortedClients);
      } catch (error) {
        console.error("Erro ao buscar os dados dos clientes:", error);
        toast.error("Erro ao buscar os dados dos clientes.");
      }
    };

    fetchClients();
  }, [selectedStatus]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    setSelectedStatus(status);
  };

  const handleSendMessage = async (client: Client) => {
    try {
      console.log(client);
      const templateMessage01 = `Olá *${getFirstName(
        client.fullname
      )}*, somos da da equipe *SortudoPix*, referente ao sorteio de uma *Honda Broz 160cc* que você estava participando... A empresa que gerenciava a rifa teve um problama em seu sistema devido a um ataque cibernético, e corrompeu os dados, fazendo com que nós perdessemos o controle sobre as cotas vendidas, assim impossibilitando a realização do sorteio que seria no próximo dia 21... Estamos então entrando em contato para avisar que vamos estornar os pagamentos de todos os clientes.`;

      const templateMessage02 = `${calcularRestituicao(
        client
      )} já foi estornado para sua conta. Nosso pix de estorno é no nome de *VANESSA DANTAS RODRIGUES*.`;

      // console.log(templateMessage01);
      // console.log(templateMessage02);

      const mergeMessages = `${templateMessage01}\n${templateMessage02}`;
      toast.loading("Enviando mensagem...");

      console.log(mergeMessages);

      const resMessage01 = await sendMessage(client, mergeMessages);
      await delay(5000);
      //const resMessage02 = await sendMessage(client, templateMessage02);

      if (!resMessage01) {
        throw new Error("Falha ao enviar mensagens.");
      }

      await updateClientStatus(client, "refunded");
      toast.dismiss();
      toast.success("Mensagem enviada com sucesso!");

      // Atualizando o status do cliente para 'refunded'
      setClients((prevClients) =>
        prevClients.map((c) =>
          c.id === client.id ? { ...c, status: "refunded" } : c
        )
      );
    } catch (error) {
      toast.error("Erro ao enviar a mensagem.");
      console.log(error);
    } finally {
      toast.dismiss();
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "paid":
        return "Pago";
      case "cancelled":
        return "Cancelado";
      case "refunded":
        return "Reembolsado";
      default:
        return "Desconhecido";
    }
  };

  const sendMessageWeb = (client: Client) => {
    const templateMessage01 = `Olá *${getFirstName(
      client.fullname
    )}*, somos da da equipe *SortudoPix*, referente ao sorteio de uma *Honda Broz 160cc* que você estava participando... A empresa que gerenciava a rifa teve um problama em seu sistema devido a um ataque cibernético, e corrompeu os dados, fazendo com que nós perdessemos o controle sobre as cotas vendidas, assim impossibilitando a realização do sorteio que seria no próximo dia 21... Estamos então entrando em contato para avisar que vamos estornar os pagamentos de todos os clientes.`;

    const templateMessage02 = `${calcularRestituicao(
      client
    )} já foi estornado para sua conta. Nosso pix de estorno é no nome de *VANESSA DANTAS RODRIGUES*.`;

    const mergeMessages = `${templateMessage01}\n${templateMessage02}`;

    const link = `https://wa.me/55${client.phone}?text=${mergeMessages}`;

    window.open(link, "_blank");
  };

  return (
    <div className="p-4">
      <Toaster />

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <select
            value={selectedStatus}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
            <option value="refunded">Reembolsado</option>
          </select>
          <span className="text-gray-700">{`Total: ${clients.length}`}</span>
        </div>
        <button
          className="bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600 transition duration-300"
          onClick={logout}
        >
          Sair
        </button>
      </div>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 border-b">Nome Completo</th>
            <th className="px-4 py-2 border-b">Telefone</th>
            <th className="px-4 py-2 border-b">CPF</th>
            <th className="px-4 py-2 border-b">Quantidade</th>
            <th className="px-4 py-2 border-b">Valor Total</th>
            <th className="px-4 py-2 border-b">Desconto</th>
            <th className="px-4 py-2 border-b">Valor Final</th>
            <th className="px-4 py-2 border-b">Status</th>
            <th className="px-4 py-2 border-b">Ações</th>
            <th className="px-4 py-2 border-b">Web</th> {/* Nova coluna */}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td className="px-4 py-2 border-b">{client.fullname}</td>
              <td className="px-4 py-2 border-b">{client.phone}</td>
              <td className="px-4 py-2 border-b">{client.cpf || "N/A"}</td>
              <td className="px-4 py-2 border-b">{client.quantity}</td>
              <td className="px-4 py-2 border-b">
                {Number(
                  +client.total_amount + Number(client.discount_amount ?? 0)
                ).toFixed(2)}
              </td>
              <td className="px-4 py-2 border-b">
                {client.discount_amount || "N/A"}
              </td>
              <td className="px-4 py-2 border-b">{client.total_amount}</td>
              <td
                className={`px-4 py-2 border-b ${
                  client.status === "paid"
                    ? "text-green-600"
                    : client.status === "refunded"
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {getStatusLabel(client.status)}
              </td>
              <td className="px-4 py-2 border-b flex space-x-2">
                <button
                  onClick={() => handleSendMessage(client)}
                  className={`px-2 py-1 rounded text-white ${
                    client.status === "refunded" ||
                    client.status === "cancelled"
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-500"
                  }`}
                  disabled={
                    client.status === "refunded" ||
                    client.status === "cancelled"
                  }
                >
                  {client.status === "refunded" ? "Enviado" : "Enviar"}
                </button>
              </td>
              {/* Nova célula com o botão Web */}
              <td className="px-2 py-2 border-b">
                <button
                  onClick={() => sendMessageWeb(client)}
                  className="bg-green-500 text-white text-sm border border-white rounded-full px-2 py-2 hover:bg-green-600 transition duration-300"
                >
                  Web
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientList;
