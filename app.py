from flask import Flask, render_template, jsonify, request
import json, urllib.request, urllib.parse

app = Flask(__name__)

SERVER_BASES = {
    'america': 'https://gameinfo.albiononline.com',
    'europe':  'https://gameinfo-ams.albiononline.com',
    'asia':    'https://gameinfo-sgp.albiononline.com',
}

def _albion(server, path):
    base = SERVER_BASES.get(server, SERVER_BASES['america'])
    req  = urllib.request.Request(base + path, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read())

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def search():
    q      = request.args.get('q', '').strip()
    server = request.args.get('server', 'america')
    if not q:
        return jsonify({'players': [], 'guilds': []})
    base = SERVER_BASES.get(server, SERVER_BASES['america'])
    url  = base + '/api/gameinfo/search?q=' + urllib.parse.quote(q)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            return jsonify(json.loads(r.read()))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/player/<server>/<player_id>')
def player_detail(server, player_id):
    try:
        return jsonify(_albion(server, '/api/gameinfo/players/' + urllib.parse.quote(player_id, safe='')))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/player/<server>/<player_id>/kills')
def player_kills(server, player_id):
    try:
        return jsonify(_albion(server, '/api/gameinfo/players/' + urllib.parse.quote(player_id, safe='') + '/kills?limit=10&offset=0'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/player/<server>/<player_id>/deaths')
def player_deaths(server, player_id):
    try:
        return jsonify(_albion(server, '/api/gameinfo/players/' + urllib.parse.quote(player_id, safe='') + '/deaths?limit=10&offset=0'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/guild/<server>/<guild_id>')
def guild_detail(server, guild_id):
    try:
        return jsonify(_albion(server, '/api/gameinfo/guilds/' + urllib.parse.quote(guild_id, safe='')))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
